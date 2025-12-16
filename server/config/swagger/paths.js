export const commonPaths = {
  "/channels": {
    get: {
      tags: ["channels"],
      summary: "List all active channels",
      description: "List all active channels in the system",
      operationId: "listChannels",
      responses: {
        200: {
          description: "List of channels",
          schema: {
            type: "array",
            items: {
              $ref: "#/definitions/Channel",
            },
          },
        },
      },
    },
  },

  "/channels/create": {
    post: {
      tags: ["channels"],
      summary: "Create a new outbound call",
      description: "Initiates an outbound call with specified parameters",
      operationId: "createOutboundCall",
      parameters: [
        {
          in: "body",
          name: "callRequest",
          required: true,
          schema: {
            $ref: "#/definitions/OutboundCallRequest",
          },
        },
        // {
        //   name: "extension",
        //   in: "query",
        //   required: false,
        //   type: "string",
        //   description: "Extension to dial after answering",
        // },
        // {
        //   name: "context",
        //   in: "query",
        //   required: false,
        //   type: "string",
        //   description: "Context to dial after answering",
        // },
        // {
        //   name: "priority",
        //   in: "query",
        //   required: false,
        //   type: "integer",
        //   default: 1,
        //   description: "Priority to dial after answering",
        // },
        // {
        //   name: "app",
        //   in: "query",
        //   required: false,
        //   type: "string",
        //   description: "Application to connect channel to",
        // },
        // {
        //   name: "appArgs",
        //   in: "query",
        //   required: false,
        //   type: "string",
        //   description: "Arguments to pass to application",
        // },
        // {
        //   name: "callerId",
        //   in: "query",
        //   required: false,
        //   type: "string",
        //   description: "CallerID to use when dialing",
        // },
      ],
      responses: {
        200: {
          description: "Call created successfully",
          schema: {
            $ref: "#/definitions/Channel",
          },
        },
        400: {
          description: "Invalid parameters",
          schema: {
            $ref: "#/definitions/ErrorResponse",
          },
        },
        500: {
          description: "Server error",
          schema: {
            $ref: "#/definitions/ErrorResponse",
          },
        },
      },
    },
  },

  "/channels/{channelId}": {
    get: {
      tags: ["channels"],
      summary: "Get channel details",
      description: "Retrieve details of a specific channel",
      operationId: "getChannel",
      parameters: [
        {
          name: "channelId",
          in: "path",
          required: true,
          type: "string",
          description: "ID of the channel to retrieve",
        },
      ],
      responses: {
        200: {
          description: "Channel details retrieved successfully!",
          schema: {
            $ref: "#/definitions/Channel",
          },
        },
        404: {
          description: "Channel not found",
          schema: {
            $ref: "#/definitions/ErrorResponse",
          },
        },
      },
    },
    delete: {
      tags: ["channels"],
      summary: "Delete (hang up) channel",
      description: "Delete (hang up) a channel",
      operationId: "deleteChannel",
      parameters: [
        {
          name: "channelId",
          in: "path",
          required: true,
          type: "string",
          description: "Channel ID",
        },
      ],
      responses: {
        204: {
          description: "Channel deleted successfully",
        },
      },
    },
  },
  "/channels/{channelId}/answer": {
    post: {
      tags: ["channels"],
      summary: "Answer channel",
      description: "Answer a channel",
      operationId: "answerChannel",
      parameters: [
        {
          name: "channelId",
          in: "path",
          required: true,
          type: "string",
          description: "Channel ID",
        },
      ],
      responses: {
        204: {
          description: "Channel answered successfully",
        },
      },
    },
  },
  "/bridges": {
    get: {
      tags: ["bridges"],
      summary: "List all bridges",
      description: "List all bridges in the system",
      operationId: "listBridges",
      responses: {
        200: {
          description: "List of bridges",
          schema: {
            type: "array",
            items: {
              $ref: "#/definitions/Bridge",
            },
          },
        },
      },
    },
    post: {
      tags: ["bridges"],
      summary: "Create bridge",
      description: "Create a new bridge",
      operationId: "createBridge",
      parameters: [
        {
          name: "type",
          in: "query",
          required: false,
          type: "string",
          description: "Type of bridge",
          enum: ["mixing", "holding"],
        },
        {
          name: "name",
          in: "query",
          required: false,
          type: "string",
          description: "Name of the bridge",
        },
      ],
      responses: {
        200: {
          description: "Bridge created successfully",
          schema: {
            $ref: "#/definitions/Bridge",
          },
        },
      },
    },
  },
  "/bridges/{bridgeId}/addChannel": {
    post: {
      tags: ["bridges"],
      summary: "Add channel to bridge",
      description: "Add a channel to a bridge",
      operationId: "addChannelToBridge",
      parameters: [
        {
          name: "bridgeId",
          in: "path",
          required: true,
          type: "string",
          description: "Bridge ID",
        },
        {
          name: "channel",
          in: "query",
          required: true,
          type: "string",
          description: "Channel ID",
        },
      ],
      responses: {
        204: {
          description: "Channel added successfully",
        },
      },
    },
  },
  "/recordings/live/{recordingName}": {
    post: {
      tags: ["recordings"],
      summary: "Start live recording",
      description: "Start a live recording",
      operationId: "startLiveRecording",
      parameters: [
        {
          name: "recordingName",
          in: "path",
          required: true,
          type: "string",
          description: "Recording name",
        },
        {
          name: "format",
          in: "query",
          required: true,
          type: "string",
          description: "Format to encode audio in",
        },
        {
          name: "maxDurationSeconds",
          in: "query",
          required: false,
          type: "integer",
          description: "Maximum duration of the recording in seconds",
        },
      ],
      responses: {
        204: {
          description: "Recording started successfully",
        },
      },
    },
  },
};
