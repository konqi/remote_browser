# Remote Browser

Opens the browser on a different machine than the one you're working on.

This is inspired by the way VSCode handles opening the browser on the client when doing some remote development stuff.
From an OS side this works by exporting the `BROWSER` environment variable and delegate opening an URL with the command specified in there.

# Usage

See output of `--help`:

```
usage: node index.js [flags] [url]

Flags:
--help                 Shows this help
-a|--app               App to use for opening urls in client
                       (default: system default browser)
                       This is only relevant in client-mode
-c|--client            Run in client mode
                       (The client is the one that actually opens the browser)
-h|--host <hostname>   Hostname to run service on / connect to
                       (default: localhost)
-p|--port <number>     Port to listen on / connect to
                       (default: 8000)
--rc                   Prints env hint

Example:
Host A: Start server:   node index.js
Host B: Connect client: node index.js --client
Host A: Open URL:       node index.js https://www.google.com
```

The server will ask you to export the `BROWSER` env variable. This is required to make this work with tools like `xdg-open` and `sensible-browser`. If you don't want to do this every time, you can add the line in your shell's rc file. You can run `node /path/to/index.js --rc` to see how the line should look like.

## How it works

This tool works via three components:

1. The server opens a TCP and an IPC socket.
    - The TCP socket is used to connect clients that open the browser.
    - The IPC socket is used to send URLs via cli to the running server and from there to the client.
2. The client connects to the TCP socket and waits for URLs to open locally.
3. The server can be called with an URL as second argument, which passes the URL to the server via IPC, which forwards the URL to all connected clients.

# Usage Warning

The connections used by this tool are insecure. If you want to use it over an unsecured network, you should consider tunneling the TCP port via SSH (e.g. `ssh -L 8000:127.0.0.1:8000 username@remote_host`)
