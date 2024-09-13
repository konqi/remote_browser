import { Socket } from 'net'
import open from 'open'

const URL_REGEX = /^https?:\/\//

export class BrowserHelperClient {
	#host = 'localhost'
	#port = 8000
	#client = null
	#app = null

	constructor({ port, host, app } = {}) {
		this.#host = host ?? this.#host
		this.#port = port ?? this.#port
		this.#app = app ?? null

		this.#client = new Socket()
	}

	up = () => {
		const socket = this.#client.connect(this.#port, this.#host, this.#tcpOnConnected)
		socket.on('data', this.#tcpOnData)
	}

	#tcpOnConnected = () => {
		console.log('Connected to server')
	}

	#tcpOnData = (data) => {
		const receivedData = data.toString()
		console.log('received data: ' + receivedData)

		receivedData.split('\n').forEach((line) => {
			if (URL_REGEX.test(line)) {
				console.log('Opening URL in browser: ' + line)
				open(line, this.#app ? { app: { name: this.#app } } : undefined)
			}
		})
	}
}
