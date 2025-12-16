export const commonDefinitions = {
  OutboundCallRequest: {
    type: "object",
    required: ["endpoint"],
    properties: {
      endpoint: {
        type: "string",
        description: "SIP endpoint to call (e.g., SIP/1000)",
        example: "SIP/1000",
      },
      context: {
        type: "string",
        description: "Dialplan context",
        example: "from-internal",
        default: "from-internal",
      },
      extension: {
        type: "string",
        description: "Extension to dial",
        example: "1000",
      },
      priority: {
        type: "integer",
        description: "Dialplan priority",
        example: 1,
        default: 1,
      },
      callerId: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Caller ID name",
            example: "John Doe",
          },
          number: {
            type: "string",
            description: "Caller ID number",
            example: "1234567890",
          },
        },
      },
      variables: {
        type: "object",
        description: "Channel variables to set",
        additionalProperties: {
          type: "string",
        },
        example: {
          CALL_TYPE: "outbound",
          ACCOUNT_ID: "12345",
        },
      },
    },
  },
  Channel: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Unique identifier of the channel",
      },
      name: {
        type: "string",
        description: "Name of the channel",
      },
      state: {
        type: "string",
        description: "Current state of the channel",
        enum: [
          "Down",
          "Reserved",
          "OffHook",
          "Dialing",
          "Ring",
          "Ringing",
          "Up",
          "Busy",
          "Dialing Offhook",
          "Pre-ring",
          "Unknown",
        ],
      },
      caller: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Caller ID name",
          },
          number: {
            type: "string",
            description: "Caller ID number",
          },
        },
      },
      connected: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Connected line name",
          },
          number: {
            type: "string",
            description: "Connected line number",
          },
        },
      },
    },
  },
  ErrorResponse: {
    type: "object",
    properties: {
      error: {
        type: "string",
        description: "Error message",
        example: "Invalid endpoint specified",
      },
      details: {
        type: "string",
        description: "Detailed error information",
        example: "Endpoint SIP/1000 is not registered",
      },
    },
    required: ["error"],
  },
  Bridge: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Unique identifier for the bridge",
      },
      technology: {
        type: "string",
        description: "Bridge technology",
      },
      bridge_type: {
        type: "string",
        description: "Type of bridge",
        enum: ["mixing", "holding"],
      },
      bridge_class: {
        type: "string",
        description: "Class of bridge",
      },
      channels: {
        type: "array",
        items: {
          type: "string",
        },
        description: "List of channels in the bridge",
      },
    },
  },
  Endpoint: {
    type: "object",
    properties: {
      technology: {
        type: "string",
        description: "Technology of the endpoint (SIP, PJSIP, IAX2, etc.)",
      },
      resource: {
        type: "string",
        description: "Resource name/identifier",
      },
      state: {
        type: "string",
        description: "Endpoint state",
        enum: ["online", "offline", "unknown"],
      },
      channel_ids: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Channels currently associated with the endpoint",
      },
    },
  },

  Recording: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Recording name",
      },
      format: {
        type: "string",
        description: "Recording format (wav, gsm, etc.)",
      },
      state: {
        type: "string",
        description: "Current state of the recording",
        enum: ["queued", "recording", "paused", "done", "failed", "canceled"],
      },
      duration: {
        type: "integer",
        description: "Duration in seconds of the recording",
      },
      talking_duration: {
        type: "integer",
        description: "Duration of talking detected in the recording",
      },
      silence_duration: {
        type: "integer",
        description: "Duration of silence detected in the recording",
      },
    },
  },

  PlaybackControl: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Unique ID for this playback operation",
      },
      media_uri: {
        type: "string",
        description: "URI of the media to play",
      },
      target_uri: {
        type: "string",
        description: "URI of the channel or bridge to play the media on",
      },
      state: {
        type: "string",
        description: "Current state of the playback",
        enum: ["queued", "playing", "paused", "done", "failed", "canceled"],
      },
      language: {
        type: "string",
        description: "Language of the media being played",
      },
    },
  },

  DeviceState: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name of the device",
      },
      state: {
        type: "string",
        description: "State of the device",
        enum: [
          "UNKNOWN",
          "NOT_INUSE",
          "INUSE",
          "BUSY",
          "INVALID",
          "UNAVAILABLE",
          "RINGING",
          "RINGINUSE",
          "ONHOLD",
        ],
      },
    },
  },

  Mailbox: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name of the mailbox",
      },
      old_messages: {
        type: "integer",
        description: "Number of old messages",
      },
      new_messages: {
        type: "integer",
        description: "Number of new messages",
      },
    },
  },

  Sound: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Sound identifier",
      },
      text: {
        type: "string",
        description: "Text description of the sound",
      },
      formats: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Available formats for the sound",
      },
      language: {
        type: "string",
        description: "Language of the sound file",
      },
    },
  },

  Application: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Application name",
      },
      channel_ids: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Channels currently associated with this application",
      },
      bridge_ids: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Bridges currently associated with this application",
      },
      endpoint_ids: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Endpoints currently associated with this application",
      },
    },
  },

  CallerID: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Caller name",
      },
      number: {
        type: "string",
        description: "Caller number",
      },
    },
  },

  DialplanCEP: {
    type: "object",
    properties: {
      context: {
        type: "string",
        description: "Dialplan context",
      },
      exten: {
        type: "string",
        description: "Dialplan extension",
      },
      priority: {
        type: "integer",
        description: "Dialplan priority",
      },
      app_name: {
        type: "string",
        description: "Application name",
      },
      app_data: {
        type: "string",
        description: "Application data",
      },
    },
  },

  StasisStart: {
    type: "object",
    properties: {
      channel: {
        $ref: "#/definitions/Channel",
        description: "Channel that entered Stasis",
      },
      replace_channel: {
        $ref: "#/definitions/Channel",
        description: "Channel that is being replaced (if this is a masquerade)",
      },
      args: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Arguments passed to the Stasis application",
      },
    },
  },

  StasisEnd: {
    type: "object",
    properties: {
      channel: {
        $ref: "#/definitions/Channel",
        description: "Channel that left Stasis",
      },
    },
  },

  AsteriskInfo: {
    type: "object",
    properties: {
      build: {
        type: "object",
        properties: {
          os: {
            type: "string",
            description: "Operating system Asterisk was built on",
          },
          kernel: {
            type: "string",
            description: "Kernel version Asterisk was built on",
          },
          machine: {
            type: "string",
            description: "Machine architecture Asterisk was built on",
          },
          options: {
            type: "string",
            description: "Compile time options",
          },
          date: {
            type: "string",
            description: "Build date",
          },
        },
      },
      system: {
        type: "object",
        properties: {
          version: {
            type: "string",
            description: "Asterisk version",
          },
          entity_id: {
            type: "string",
            description: "Entity ID",
          },
        },
      },
      config: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Asterisk system name",
          },
          default_language: {
            type: "string",
            description: "Default system language",
          },
          max_channels: {
            type: "integer",
            description: "Maximum number of simultaneous channels",
          },
          max_open_files: {
            type: "integer",
            description: "Maximum number of open files",
          },
        },
      },
    },
  },
};
