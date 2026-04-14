import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Route, RouteType, Methods, BodyTypes, StreamingMode } from "@mockoon/commons";
import {
  readEnvironment,
  writeEnvironment,
  findEnvironmentFile,
} from "../mockoon/fileManager.js";
import { STORAGE_DIRS, uuidv4 } from "../utils/helpers.js";

export function registerRouteTools(server: McpServer): void {
  // List all routes in an environment
  server.registerTool(
    "list_routes",
    {
      description: "List all routes in a Mockoon environment",
      inputSchema: { environmentId: z.uuid().describe("Environment UUID") },
    },
    async ({ environmentId }) => {
      const filePath = findEnvironmentFile(STORAGE_DIRS, environmentId);
      if (!filePath) {
        return { content: [{ type: "text", text: `Environment '${environmentId}' not found.` }], isError: true };
      }

      const env = readEnvironment(filePath);
      if (env.routes.length === 0) {
        return { content: [{ type: "text", text: "No routes configured." }] };
      }

      const list = env.routes
        .map((r) => `- [${r.uuid}] ${r.method.toUpperCase()} /${r.endpoint}  (${r.responses.length} response(s))`)
        .join("\n");
      return { content: [{ type: "text", text: list }] };
    }
  );

  // Create a new route
  server.registerTool(
    "create_route",
    {
      description: "Create a new HTTP route in a Mockoon environment",
      inputSchema: {
        environmentId: z.uuid().describe("Environment UUID"),
        method: z.enum(["get", "post", "put", "patch", "delete", "head", "options"]).describe("HTTP method"),
        endpoint: z.string().describe("Route path (e.g. users/:id)"),
        statusCode: z.number().int().min(100).max(599).default(200).describe("HTTP response status code"),
        body: z.string().default("").describe("Response body (plain string or JSON)"),
        label: z.string().default("").describe("Optional label for the response"),
        contentType: z.string().describe("Value for the Content-Type header (e.g. application/json)"),
        headers: z.array(
          z.object({
            key: z.string().describe("Header name (e.g. X-Custom-Header)"),
            value: z.string().describe("Header value"),
          })
        ).default([]).describe("Additional response headers (excluding Content-Type)"),
      },
    },
    async ({ environmentId, method, endpoint, statusCode, body, label, contentType, headers }) => {
      const filePath = findEnvironmentFile(STORAGE_DIRS, environmentId);
      if (!filePath) {
        return { content: [{ type: "text", text: `Environment '${environmentId}' not found.` }], isError: true };
      }

      const env = readEnvironment(filePath);
      const routeUuid = uuidv4();
      const responseUuid = uuidv4();

      const newRoute: Route = {
        uuid: routeUuid,
        type: RouteType.HTTP,
        documentation: label,
        method: method as Methods,
        endpoint: endpoint.replace(/^\//, ""),
        responses: [
          {
            uuid: responseUuid,
            body,
            latency: 0,
            statusCode,
            label,
            headers: [
              { key: "Content-Type", value: contentType },
              ...headers.map(h => ({ key: h.key, value: h.value })),
            ],
            bodyType: BodyTypes.INLINE,
            filePath: "",
            databucketID: "",
            sendFileAsBody: false,
            rules: [],
            rulesOperator: "OR",
            disableTemplating: false,
            fallbackTo404: false,
            default: true,
            crudKey: "id",
            callbacks: [],
          },
        ],
        responseMode: null,
        streamingMode: null,
        streamingInterval: 0,
      };

      env.routes.push(newRoute);
      // rootChildren must be updated so the route appears in the Mockoon desktop UI
      env.rootChildren.push({ type: "route", uuid: routeUuid });

      writeEnvironment(filePath, env);
      return {
        content: [
          {
            type: "text",
            text: `Route created: ${method.toUpperCase()} /${endpoint}\nRoute ID: ${routeUuid}`,
          },
        ],
      };
    }
  );

  // Delete a route
  server.registerTool(
    "delete_route",
    {
      description: "Delete a route from a Mockoon environment",
      inputSchema: {
        environmentId: z.uuid().describe("Environment UUID"),
        routeId: z.uuid().describe("UUID of the route to delete"),
      },
    },
    async ({ environmentId, routeId }) => {
      const filePath = findEnvironmentFile(STORAGE_DIRS, environmentId);
      if (!filePath) {
        return { content: [{ type: "text", text: `Environment '${environmentId}' not found.` }], isError: true };
      }

      const env = readEnvironment(filePath);
      const before = env.routes.length;
      env.routes = env.routes.filter((r) => r.uuid !== routeId);
      env.rootChildren = env.rootChildren.filter(
        (c) => !(c.type === "route" && c.uuid === routeId)
      );

      if (env.routes.length === before) {
        return { content: [{ type: "text", text: `Route '${routeId}' not found.` }], isError: true };
      }

      writeEnvironment(filePath, env);
      return { content: [{ type: "text", text: `Route '${routeId}' deleted.` }] };
    }
  );

  // Update the default response body of a route
  server.registerTool(
    "update_route_body",
    {
      description: "Update the body of the default response of a route",
      inputSchema: {
        environmentId: z.uuid().describe("Environment UUID"),
        routeId: z.uuid().describe("Route UUID"),
        body: z.string().describe("New response body"),
        statusCode: z.number().int().min(100).max(599).optional().describe("New status code (optional)"),
      },
    },
    async ({ environmentId, routeId, body, statusCode }) => {
      const filePath = findEnvironmentFile(STORAGE_DIRS, environmentId);
      if (!filePath) {
        return { content: [{ type: "text", text: `Environment '${environmentId}' not found.` }], isError: true };
      }

      const env = readEnvironment(filePath);
      const route = env.routes.find((r) => r.uuid === routeId);
      if (!route) {
        return { content: [{ type: "text", text: `Route '${routeId}' not found.` }], isError: true };
      }

      const defaultResponse = route.responses.find((r) => r.default) ?? route.responses[0];
      if (!defaultResponse) {
        return { content: [{ type: "text", text: "No response configured for this route." }], isError: true };
      }

      defaultResponse.body = body;
      if (statusCode !== undefined) defaultResponse.statusCode = statusCode;

      writeEnvironment(filePath, env);
      return { content: [{ type: "text", text: "Route updated successfully." }] };
    }
  );
  // Update response headers of a route
  server.registerTool(
    "update_route_headers",
    {
      description: "Overwrite all headers of the default response of a route. Replaces the entire header list — include Content-Type if you want to preserve it.",
      inputSchema: {
        environmentId: z.uuid().describe("Environment UUID"),
        routeId: z.uuid().describe("Route UUID"),
        headers: z.array(
          z.object({
            key: z.string().describe("Header name (e.g. Content-Type)"),
            value: z.string().describe("Header value (e.g. application/json)"),
          })
        ).describe("New list of headers (replaces existing ones)"),
      },
    },
    async ({ environmentId, routeId, headers }) => {
      const filePath = findEnvironmentFile(STORAGE_DIRS, environmentId);
      if (!filePath) {
        return { content: [{ type: "text", text: `Environment '${environmentId}' not found.` }], isError: true };
      }

      const env = readEnvironment(filePath);
      const route = env.routes.find((r) => r.uuid === routeId);
      if (!route) {
        return { content: [{ type: "text", text: `Route '${routeId}' not found.` }], isError: true };
      }

      const defaultResponse = route.responses.find((r) => r.default) ?? route.responses[0];
      if (!defaultResponse) {
        return { content: [{ type: "text", text: "No response configured for this route." }], isError: true };
      }

      defaultResponse.headers = headers.map(h => ({ key: h.key, value: h.value }));

      writeEnvironment(filePath, env);
      return {
        content: [{ type: "text", text: `Headers updated for route '${routeId}'. (${headers.length} header(s) set)` }],
      };
    }
  );

  // Add a new response to an existing route
  server.registerTool(
    "add_route_response",
    {
      description: "Add a new response to an existing route in a Mockoon environment",
      inputSchema: {
        environmentId: z.uuid().describe("Environment UUID"),
        routeId: z.uuid().describe("Route UUID"),
        statusCode: z.number().int().min(100).max(599).default(200).describe("HTTP response status code"),
        body: z.string().default("").describe("Response body (plain string or JSON)"),
        label: z.string().default("").describe("Optional label for the response"),
        contentType: z.string().default("application/json").describe("Value for the Content-Type header"),
        headers: z.array(
          z.object({
            key: z.string().describe("Header name"),
            value: z.string().describe("Header value"),
          })
        ).default([]).describe("Additional response headers (excluding Content-Type)"),
        rules: z.array(
          z.object({
            target: z.enum(["body", "query", "header", "cookie", "params", "path", "method", "request_number", "global_var", "data_bucket", "templating"]).describe("Rule target"),
            modifier: z.string().describe("Target modifier (e.g. header name, query param name)"),
            value: z.string().describe("Value to match against"),
            invert: z.boolean().default(false).describe("Invert the rule result"),
            operator: z.enum(["equals", "regex", "regex_i", "null", "empty_array", "array_includes", "valid_json_schema"]).describe("Comparison operator"),
          })
        ).default([]).describe("Activation rules for this response"),
        rulesOperator: z.enum(["AND", "OR"]).default("OR").describe("Logical operator between rules"),
        setAsDefault: z.boolean().default(false).describe("If true, mark this response as default and demote all existing ones"),
      },
    },
    async ({ environmentId, routeId, statusCode, body, label, contentType, headers, rules, rulesOperator, setAsDefault }) => {
      const filePath = findEnvironmentFile(STORAGE_DIRS, environmentId);
      if (!filePath) {
        return { content: [{ type: "text", text: `Environment '${environmentId}' not found.` }], isError: true };
      }

      const env = readEnvironment(filePath);
      const route = env.routes.find((r) => r.uuid === routeId);
      if (!route) {
        return { content: [{ type: "text", text: `Route '${routeId}' not found.` }], isError: true };
      }

      if (setAsDefault) {
        for (const r of route.responses) {
          r.default = false;
        }
      }

      const responseUuid = uuidv4();
      route.responses.push({
        uuid: responseUuid,
        body,
        latency: 0,
        statusCode,
        label,
        headers: [
          { key: "Content-Type", value: contentType },
          ...headers.map(h => ({ key: h.key, value: h.value })),
        ],
        bodyType: BodyTypes.INLINE,
        filePath: "",
        databucketID: "",
        sendFileAsBody: false,
        rules: rules.map(r => ({
          target: r.target as any,
          modifier: r.modifier,
          value: r.value,
          invert: r.invert,
          operator: r.operator as any,
        })),
        rulesOperator: rulesOperator as any,
        disableTemplating: false,
        fallbackTo404: false,
        default: setAsDefault,
        crudKey: "id",
        callbacks: [],
      });

      writeEnvironment(filePath, env);
      return {
        content: [{ type: "text", text: `Response added to route '${routeId}'.\nResponse ID: ${responseUuid}` }],
      };
    }
  );

  // Get the default response of a route
  server.registerTool(
    "get_default_response",
    {
      description: "Return the current default response of a route, including status code, headers, and body. Useful to inspect the current state before making changes.",
      inputSchema: {
        environmentId: z.uuid().describe("Environment UUID"),
        routeId: z.uuid().describe("Route UUID"),
      },
    },
    async ({ environmentId, routeId }) => {
      const filePath = findEnvironmentFile(STORAGE_DIRS, environmentId);
      if (!filePath) {
        return { content: [{ type: "text", text: `Environment '${environmentId}' not found.` }], isError: true };
      }

      const env = readEnvironment(filePath);
      const route = env.routes.find((r) => r.uuid === routeId);
      if (!route) {
        return { content: [{ type: "text", text: `Route '${routeId}' not found.` }], isError: true };
      }

      const defaultResponse = route.responses.find((r) => r.default) ?? route.responses[0];
      if (!defaultResponse) {
        return { content: [{ type: "text", text: "No response configured for this route." }], isError: true };
      }

      const headers = defaultResponse.headers.map((h) => `  ${h.key}: ${h.value}`).join("\n");
      const text = [
        `Response ID: ${defaultResponse.uuid}`,
        `Label: ${defaultResponse.label || "(none)"}`,
        `Status: ${defaultResponse.statusCode}`,
        `Headers:\n${headers || "  (none)"}`,
        `Body:\n${defaultResponse.body || "  (empty)"}`,
      ].join("\n");

      return { content: [{ type: "text", text }] };
    }
  );

  // Set a response as the default for a route
  server.registerTool(
    "set_default_response",
    {
      description: "Set an existing response as the default for a route (demotes all other responses)",
      inputSchema: {
        environmentId: z.uuid().describe("Environment UUID"),
        routeId: z.uuid().describe("Route UUID"),
        responseId: z.uuid().describe("UUID of the response to set as default"),
      },
    },
    async ({ environmentId, routeId, responseId }) => {
      const filePath = findEnvironmentFile(STORAGE_DIRS, environmentId);
      if (!filePath) {
        return { content: [{ type: "text", text: `Environment '${environmentId}' not found.` }], isError: true };
      }

      const env = readEnvironment(filePath);
      const route = env.routes.find((r) => r.uuid === routeId);
      if (!route) {
        return { content: [{ type: "text", text: `Route '${routeId}' not found.` }], isError: true };
      }

      const target = route.responses.find((r) => r.uuid === responseId);
      if (!target) {
        return { content: [{ type: "text", text: `Response '${responseId}' not found in route '${routeId}'.` }], isError: true };
      }

      for (const r of route.responses) {
        r.default = r.uuid === responseId;
      }

      writeEnvironment(filePath, env);
      return {
        content: [{ type: "text", text: `Response '${responseId}' set as default for route '${routeId}'.` }],
      };
    }
  );
}



