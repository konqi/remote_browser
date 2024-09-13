import { createServer } from 'net'
import { IPCModule } from 'node-ipc'

const URL_REGEX = /^https?:\/\//

function testPort(port, host) {
	return new Promise((resolve) => {
		const tester = createServer()
			.on('error', (err) => {
				if (err.code === 'EADDRINUSE') {
					resolve(true)
				}
			})
			.on('listening', () => {
				resolve(false)
				tester.close()
			})
		tester.listen(port, host)
	})
}

export class BrowserHelperServer {
	#clients = []
	#tcpServer = null
	#ipc = new IPCModule()
	#host = 'localhost'
	#port = 8000

	static get serverId() {
		return 'tcpsrv'
	}

	get clientCount() {
		return this.#clients.length
	}

	constructor({ host, port } = {}) {
		this.#ipc.config.retry = 1500
		this.#ipc.config.id = BrowserHelperServer.serverId

		this.#tcpServer = createServer(this.#tcpOnConnect)
		this.#host = host ?? this.#host
		this.#port = port ?? this.#port
	}

	up = () => {
		this.#ipcUp()
		this.#tcpUp()
	}

	down = () => {
		console.log('Shutting down server')

		this.#ipc.server.stop()
		this.#tcpServer.stop?.()
	}

	portInUse = () => testPort(this.#port, this.#host)

	#ipcUp = () => {
		this.#ipc.serve(() => {
			this.#ipc.server.on('message', this.#onIpcMessage)
		})
		this.#ipc.server.start()
	}

	#onIpcMessage = (data) => {
		if (URL_REGEX.test(data)) {
			this.#clients.forEach((client) => {
				client.write(data)
			})
		}
	}

	#tcpUp = () => {
		this.#tcpServer.on('listening', () => {
			console.log(`Server is listening on port ${this.#port}`)
		})
		this.#tcpServer.on('error', this.#tcpOnError)

		this.#tcpServer.listen(this.#port, this.#host)
	}

	#tcpOnError = (error) => {
		if (error.code === 'EADDRINUSE') {
			console.log('Port is already in use. Cannot start the server.')
			this.down()
		} else {
			console.log('Some other error: ', error)
		}
	}

	#tcpOnConnect = (socket) => {
		this.#clients.push(socket)

		const { tcpOnData, tcpOnEnd } = this.#tcpSocketBoundFns(socket)
		socket.on('data', tcpOnData)
		socket.on('end', tcpOnEnd)
	}

	#tcpSocketBoundFns = (socket) => ({
		tcpOnData: (data) => {
			console.log('Received: ' + data)
			socket.write('Data received')
		},
		tcpOnEnd: () => {
			const index = this.#clients.indexOf(socket)
			if (index > -1) {
				this.#clients.splice(index, 1)
			}
		},
	})
}
