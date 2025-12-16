// config/amiClient.js
import net from "net";
import { EventEmitter } from "events";
import chalk from "chalk";

function createAMIClient() {
  const client = new EventEmitter();
  let netClient = null;
  let connected = false;
  const callbacks = new Map();
  const pendingActions = [];
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 10;
  const RECONNECT_DELAY = 5000;
  let loginSent = false;
  let currentResponse = null;

  const host = process.env.AMI_HOST;
  const port = process.env.AMI_PORT;
  const username = process.env.ASTERISK_AMI_USERNAME;
  const password = process.env.AMI_PASSWORD;

  function connect() {
    if (netClient) {
      netClient.destroy();
    }

    return new Promise((resolve, reject) => {
      console.log(chalk.blue(`[AMI] Connecting to ${host}:${port}...`));

      netClient = net.createConnection({ host, port }, () => {
        console.log(chalk.blue("[AMI] TCP Connection established"));
      });

      // CRITICAL: Set error domain to prevent uncaught exceptions from crashing the process
      netClient.on('error', (err) => {
        // This handler MUST exist to prevent uncaught exception crashes
        console.error(chalk.red(`[AMI] Socket error caught: ${err.message}`));
      });

      const loginTimeout = setTimeout(() => {
        if (!connected) {
          reject(new Error("AMI connection timeout"));
          netClient.destroy();
        }
      }, 10000);

      const handleLogin = async () => {
        if (loginSent) return;
        loginSent = true;

        try {
          console.log(chalk.blue("[AMI] Sending login credentials..."));
          const response = await sendAction({
            Action: "Login",
            Username: username,
            Secret: password,
            Events: "all",
          });

          if (response.Response === "Success") {
            const wasDisconnected = !connected;
            connected = true;
            reconnectAttempts = 0;
            clearTimeout(loginTimeout);
            console.log(chalk.green("[AMI] Authentication successful"));

            while (pendingActions.length > 0) {
              const action = pendingActions.shift();
              sendAction(action.action)
                .then(action.resolve)
                .catch(action.reject);
            }

            client.emit("connect");

            // If this is a recovery from disconnection, emit recovery event
            if (wasDisconnected && reconnectAttempts > 0) {
              console.log(
                chalk.green("[AMI] Backend recovered - AMI connection restored")
              );
              client.emit("backend:recovered", {
                type: "ami_recovery",
                timestamp: new Date().toISOString(),
              });
            }

            resolve(true);
          } else {
            const error = new Error(
              `Authentication failed: ${JSON.stringify(response, null, 2)}`
            );
            client.emit("error", error);
            reject(error);
          }
        } catch (error) {
          clearTimeout(loginTimeout);
          client.emit("error", error);
          reject(error);
        }
      };

      const onInitialData = (data) => {
        const message = data.toString();
        if (message.includes("Asterisk Call Manager")) {
          netClient.removeListener("data", onInitialData);
          netClient.on("data", onData);
          handleLogin();
        }
      };

      netClient.on("data", onInitialData);
      netClient.on("error", onError);
      netClient.on("end", onDisconnect);
      netClient.on("close", onDisconnect);
    });
  }

  function onData(data) {
    const messages = data.toString().split("\r\n\r\n");
    messages.forEach((message) => {
      if (!message.trim()) return;

      const parsed = parseMessage(message);

      // Handle command responses with proper lifecycle
      if (parsed.ActionID && callbacks.has(parsed.ActionID)) {
        const { resolve } = callbacks.get(parsed.ActionID);

        if (parsed.Response === "Follows") {
          // Initialize response collection
          currentResponse = {
            ...parsed,
            Output: parsed.Output || "",
            complete: false,
          };
        } else if (
          parsed.Response === "Success" ||
          parsed.Response === "Error"
        ) {
          if (currentResponse && currentResponse.ActionID === parsed.ActionID) {
            // Append final output and mark as complete
            if (parsed.Output) {
              currentResponse.Output += parsed.Output;
            }
            currentResponse.complete = true;
            resolve(currentResponse);
            currentResponse = null;
          } else {
            // Single response
            resolve(parsed);
          }
          callbacks.delete(parsed.ActionID);
        } else if (
          currentResponse &&
          currentResponse.ActionID === parsed.ActionID
        ) {
          // Accumulate output for multi-line responses
          if (parsed.Output) {
            currentResponse.Output += parsed.Output;
          }
        }
      } else if (parsed.Event) {
        client.emit("event", parsed);
        client.emit(parsed.Event, parsed);
      }
    });
  }

  function parseMessage(message) {
    return message.split("\r\n").reduce((obj, line) => {
      const [key, value] = line.split(": ");
      if (key && value) obj[key.trim()] = value.trim();
      return obj;
    }, {});
  }

  function sendAction(action) {
    return new Promise((resolve, reject) => {
      if (!connected && action.Action !== "Login") {
        console.warn(
          chalk.yellow("[AMI] Not connected, queuing action:", action)
        );
        pendingActions.push({ action, resolve, reject });
        return;
      }

      const actionID = `ami_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      action.ActionID = actionID;

      // Set appropriate timeouts based on action type for Asterisk 20.11.0
      let timeout;
      if (action.Action === "Command") {
        timeout = 8000; // 8 seconds for CLI commands
      } else if (
        action.Action === "QueueSummary" ||
        action.Action.startsWith("Queue")
      ) {
        timeout = 25000; // 25 seconds for queue operations (Asterisk 20.11.0 recommendation)
      } else if (
        action.Action === "PJSIPShowEndpoints" ||
        action.Action === "PJSIPShowContacts"
      ) {
        timeout = 20000; // 20 seconds for PJSIP operations
      } else {
        timeout = 15000; // 15 seconds for standard operations
      }

      callbacks.set(actionID, {
        resolve,
        reject,
        timer: setTimeout(() => {
          if (callbacks.has(actionID)) {
            console.warn(
              chalk.yellow(`[AMI] Action timeout: ${action.Action}`)
            );
            callbacks.delete(actionID);
            currentResponse = null;
            reject(new Error(`AMI Action timeout: ${action.Action}`));
          }
        }, timeout),
      });

      const message =
        Object.entries(action)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\r\n") + "\r\n\r\n";

      console.log(chalk.gray(`[AMI] Sending action: ${action.Action}`));
      netClient.write(message);
    });
  }

  function onDisconnect() {
    if (connected) {
      console.warn(
        chalk.yellow("[AMI] Connection lost. Attempting to reconnect...")
      );
      connected = false;
      client.emit("disconnect");
      attemptReconnect();
    }
  }

  function onError(err) {
    // CRITICAL: Handle ECONNRESET gracefully - don't let it crash the process
    if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
      console.warn(chalk.yellow(`[AMI] Connection error (recoverable): ${err.code} - ${err.message}`));
      if (connected) {
        connected = false;
        loginSent = false;
        client.emit("disconnect");
        attemptReconnect();
      }
      return; // Don't emit error for recoverable connection issues
    }
    console.error(chalk.red("[AMI] Connection error:", err.message));
    client.emit("error", err);
  }

  function attemptReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(
        chalk.red("[AMI] Max reconnect attempts reached. Stopping retry.")
      );
      return;
    }

    const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts);
    console.log(
      chalk.yellow(`[AMI] Reconnecting in ${delay / 1000} seconds...`)
    );

    setTimeout(() => {
      reconnectAttempts++;
      connect().catch(() => attemptReconnect());
    }, delay);
  }

  function disconnect() {
    if (netClient && connected) {
      sendAction({ Action: "Logoff" }).catch((error) => {
        console.warn(chalk.yellow("[AMI] Error during logoff:", error.message));
      });
      netClient.end();
      connected = false;
      client.emit("disconnect");
    }
  }

  return {
    connect,
    disconnect,
    sendAction,
    isConnected: () => connected,
    on: (event, listener) => client.on(event, listener),
    off: (event, listener) => client.off(event, listener),
  };
}

// Create a singleton instance
const amiClient = createAMIClient();

export const getAmiClient = () => amiClient;

export const getAmiState = () => ({
  connected: amiClient.isConnected(),
});
export default amiClient;
