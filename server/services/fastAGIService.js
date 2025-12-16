import net from "net";
import IVRFlow from "../models/IVRModel.js";

const PORT = process.env.AGI_PORT || 4574;
const HOST = "0.0.0.0"; // Bind to all interfaces
// const HOST = "127.0.0.1"; // Bind to localhost
let server = null;

const createAGIConnection = (socket) => {
  console.log("=== New AGI Connection Created ===");
  const variables = new Map();
  let buffer = "";

  const execute = async (command) => {
    console.log(`[AGI] Executing command: ${command}`);
    return new Promise((resolve, reject) => {
      socket.write(`${command}\n`, (err) => {
        if (err) {
          console.error(`[AGI] Command error: ${err.message}`);
          reject(err);
        } else {
          console.log(`[AGI] Command sent successfully`);
          resolve();
        }
      });
    });
  };

  const connection = {
    socket,
    variables,
    getVariable: async (name) => {
      await execute(`GET VARIABLE ${name}`);
      return variables.get(name);
    },
    setVariable: async (name, value) => {
      await execute(`SET VARIABLE ${name} "${value}"`);
    },
    playback: async (file) => {
      await execute(`EXEC Playback "${file}"`);
    },
    hangup: async (cause = "normal") => {
      await execute(`HANGUP ${cause}`);
    },
    // Add other AGI commands as needed
  };

  socket.on("data", (data) => {
    console.log(`[AGI] Received data: ${data.toString()}`);
    buffer += data.toString();
    if (buffer.includes("\n\n")) {
      const [variables, ...rest] = buffer.split("\n\n");
      console.log("[AGI] Parsed variables:", variables);
      variables.split("\n").forEach((line) => {
        const [key, value] = line.split(": ");
        if (key && value) {
          connection.variables.set(key.trim(), value.trim());
        }
      });
      buffer = rest.join("\n\n");
      handleCall(connection);
    }
  });

  return connection;
};

const start = () => {
  return new Promise((resolve, reject) => {
    try {
      server = net.createServer((socket) => {
        console.log(
          `New AGI connection from ${socket.remoteAddress}:${socket.remotePort}`
        );
        createAGIConnection(socket);
      });

      server.on("error", (error) => {
        console.error("FastAGI Server error:", error);
        reject(error);
      });

      server.listen(PORT, HOST, () => {
        const address = server.address();
        console.log(
          `FastAGI Server listening on ${address.address}:${address.port}`
        );
        resolve(true);
      });
    } catch (error) {
      reject(error);
    }
  });
};

const stop = () => {
  if (server) {
    server.close();
    server = null;
  }
};

const handleCall = async (call) => {
  console.log("\n=== New Call Handling Started ===");
  try {
    let ivrId = call.variables.get("agi_arg_1");

    // const ivrId = await call.getVariable("ivrId");
    // console.log(`[AGI] IVR ID: ${ivrId}`);

    // ✅ If not found in arguments, try getting it as a variable
    if (!ivrId) {
      ivrId = await call.getVariable("ivrId");
    }

    console.log(`[AGI] IVR ID: ${ivrId}`);

    if (!ivrId) {
      console.error("[AGI] No IVR ID provided - hanging up");
      await call.hangup();
      return;
    }

    const flow = await IVRFlow.findByPk(ivrId);
    if (!flow) {
      console.error(`IVR flow ${ivrId} not found`);
      await call.Hangup();
      return;
    }

    call.on("hangup", () => {
      console.log(`Hangup on channel ${call.channel}`);
    });

    call.on("error", (err) => {
      console.error(`ERROR on channel ${call.channel}: ${err}`);
    });

    // Execute the flow
    let currentBlock = flow.blocks.find((block) => block.type === "Start");
    console.log("[AGI] Starting with block:", {
      type: currentBlock.type,
      id: currentBlock.id,
    });

    while (currentBlock) {
      console.log("\n[AGI] Executing block:", {
        type: currentBlock.type,
        id: currentBlock.id,
        data: currentBlock.data,
      });

      currentBlock = await executeBlock(
        call,
        currentBlock,
        flow.connections,
        flow.blocks
      );

      console.log(
        "[AGI] Next block:",
        currentBlock
          ? {
              type: currentBlock.type,
              id: currentBlock.id,
            }
          : "None (flow ended)"
      );
    }
  } catch (error) {
    console.error("[AGI] Call handling error:", {
      message: error.message,
      stack: error.stack,
    });
    await call.hangup();
  }
};

const executeBlock = async (channel, block, connections, blocks) => {
  let result, digits, timeMatch, queueResult, listValue, fieldMatch, condition;

  switch (block.type) {
    case "Start":
      return findNextBlock(connections, block.id, blocks);

    case "Menu":
      digits = await channel.getData(block.data.prompt, {
        timeout: block.data.timeout || 5000,
        maxDigits: block.data.maxDigits || 1,
      });
      return findNextBlock(connections, block.id, blocks, parseInt(digits));

    case "InternalDial":
      result = await channel.exec("Dial", {
        technology: "SIP",
        resource: block.data.extension,
        timeout: block.data.timeout || 30000,
      });
      return findNextBlock(
        connections,
        block.id,
        blocks,
        result.status === "ANSWER" ? 0 : 1
      );

    case "GotoIfTime":
      timeMatch = await channel.checkTime(block.data.timeString);
      return findNextBlock(connections, block.id, blocks, timeMatch ? 0 : 1);

    case "PlayAudio":
      await channel.streamFile(block.data.audioFile);
      return findNextBlock(connections, block.id, blocks);

    case "Queue":
      queueResult = await channel.queue(block.data.queueName, {
        timeout: block.data.timeout || 300000,
        announceFrequency: block.data.announceFrequency || 30,
        options: block.data.options || "xX",
        url: block.data.url || "",
        agi: block.data.agi || "",
        macro: block.data.macro || "",
        gosub: block.data.goSub || "",
        position: block.data.position || "",
      });
      return findNextBlock(
        connections,
        block.id,
        blocks,
        queueResult.joined ? 0 : 1
      );

    case "SetVariable":
      await channel.setVariable(block.data.varName, block.data.varValue);
      return findNextBlock(connections, block.id, blocks);

    case "ExternalDial":
      result = await channel.exec("Dial", {
        technology: block.data.trunk,
        resource: block.data.number,
        timeout: block.data.timeout || 60000,
      });
      return findNextBlock(
        connections,
        block.id,
        blocks,
        result.status === "ANSWER" ? 0 : 1
      );

    case "Hangup":
      await channel.hangup(block.data.cause || "normal");
      return null;

    case "CheckList":
      listValue = await channel.getVariable(block.data.listName);
      fieldMatch = listValue && listValue.includes(block.data.fieldToCheck);
      return findNextBlock(connections, block.id, blocks, fieldMatch ? 0 : 1);

    case "Goto":
      await channel.goto(
        block.data.context || "default",
        block.data.extension || "s",
        block.data.priority || 1
      );
      return findNextBlock(connections, block.id, blocks);

    case "GotoIf":
      condition = await channel.execCommand(`IF ${block.data.condition}`);
      return findNextBlock(
        connections,
        block.id,
        blocks,
        condition.status === "TRUE" ? 0 : 1
      );

    case "Answer":
      result = await channel.answer();
      return findNextBlock(
        connections,
        block.id,
        blocks,
        result.status === "SUCCESS" ? 0 : 1
      );

    case "NoOp":
      await channel.verbose(`NoOp: ${block.id}`);
      return findNextBlock(connections, block.id, blocks);

    case "Math":
      await channel.exec(
        "Set",
        `${block.data.variables}=${block.data.expression}`
      );
      return findNextBlock(connections, block.id, blocks);

    case "Finally":
      return findNextBlock(connections, block.id, blocks);

    case "End":
      return null;

    default:
      throw new Error(`Unknown block type: ${block.type}`);
  }
};

const findNextBlock = (connections, currentId, blocks, condition) => {
  const connection = connections.find(
    (c) =>
      c.from === currentId &&
      (condition === undefined ? true : c.fromIndex === condition)
  );
  return connection ? blocks.find((b) => b.id === connection.to) : null;
};

export const fastAGIService = {
  PORT,
  start,
  stop,
  handleCall,
  executeBlock,
  findNextBlock,
};
