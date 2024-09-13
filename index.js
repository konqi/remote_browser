import ipc from 'node-ipc'
import minimist from 'minimist'
import { spawn } from 'child_process'
import { BrowserHelperServer } from './server.js'
import { BrowserHelperClient } from './client.js'
import chalk from 'chalk'
import { openSync } from 'fs'
import { basename } from 'path'

const args = minimist(process.argv.slice(2))

const DEFAULT_PORT = 8000
const DEFAULT_HOST = 'localhost'

const ENV_HINT = `export BROWSER='node ${import.meta.filename}'`

const help = args.help
/**
 * Flag to tell app that it should run in client mode.
 * The default is to run in server mode.
 */
const client = args.c || args.client
/**
 * Port that server opens listening socket to and client connects to
 */
const port = args.p || args.port || DEFAULT_PORT
/**
 * Host that server is listening on and client connects to
 */
const host = args.h || args.host || DEFAULT_HOST
/**
 * App name as specified in the open npm package. Options include
 * - firefox
 * - google chrome (macOS) / google-chrome (Linux) / chrome (Windows)
 * - msedge
 * - ...
 */
const app = args.a || args.app || undefined
/**
 * Unflagged argument that should contain a url that should be opened on the remote
 */
const input = args._[0]
/**
 * Helper function to print the export BROWSER variable string
 */
const rc = args.rc || false

if (help) {
	console.log(`usage: node ${basename(import.meta.filename)} [flags] [url]`)
	console.log('')
	console.log('Flags:')
	console.log('--help                 Shows this help')
	console.log('-a|--app               App to use for opening urls in client')
	console.log('                       This is only relevant in client-mode')
	console.log('                       (default: system default browser)')
	console.log('-c|--client            Run in client mode')
	console.log('                       (The client is the one that actually opens the browser)')
	console.log(`-h|--host <hostname>   Hostname to run service on / connect to`)
	console.log(`                       (default: ${DEFAULT_HOST})`)
	console.log(`-p|--port <number>     Port to listen on / connect to`)
	console.log(`                       (default: ${DEFAULT_PORT})`)
	console.log(`--rc                   Print env hint.`)
	console.log('')
	console.log('Example:')
	console.log(`Host A: Start server:   node ${basename(import.meta.filename)}`)
	console.log(`Host B: Connect client: node ${basename(import.meta.filename)} --client`)
	console.log(`Host A: Open URL:       node ${basename(import.meta.filename)} https://www.google.com`)
	process.exit(0)
}

if (rc) {
	console.log(ENV_HINT)
	process.exit(0)
}

function notice() {
	console.log('\n\n')
	console.log(chalk.redBright('!! Important !! BROWSER environment variable is not set !!'))
	console.log('The browser helper is running,\nbut to make use of it you need to run')
	console.log(chalk.yellowBright(ENV_HINT))
	console.log("in your shell or add the line to your shell's rc-file.\n")
	console.log(`${chalk.blue('How to connect a client:')}`)
	console.log(`Run this script on a machine with a browser in client, using the ${chalk.yellow('--client')} flag.`)
	console.log('\n')
}

// start of actual program

const URL_REGEX = /^https?:\/\//

function ipcSend(message) {
	ipc.config.id = 'msgsender'
	ipc.config.retry = 1500
	ipc.config.maxRetries = 1

	ipc.connectTo(BrowserHelperServer.serverId, () => {
		ipc.of[BrowserHelperServer.serverId].on('connect', () => {
			ipc.of[BrowserHelperServer.serverId].emit('message', message)
			ipc.disconnect(BrowserHelperServer.serverId)
		})
	})
}

if (client) {
	// start client mode (connect and wait for urls)
	new BrowserHelperClient({ host, port, app }).up()
} else {
	// determine if this is an open call (has URL as argument)
	// or if this should only start the forward server
	const browserHelper = new BrowserHelperServer({ host, port })

	if (URL_REGEX.test(input)) {
		// start server if not running
		if (!(await browserHelper.portInUse())) {
			console.log(chalk.redBright('Server is not running.'))

			const out = openSync('log.txt', 'w')
			const sub = spawn('nohup', ['node', import.meta.filename], {
				detached: true,
				stdio: ['ignore', out, out],
			})
			sub.unref()
		}

		// send URL to server via IPC
		ipcSend(input)
	} else {
		// start server
		browserHelper.up()

		// register signal trap for clean shutdown
		process.on('SIGINT', () => {
			console.log('\n')
			browserHelper.down()
			process.exit()
		})
	}

	// Give hints to user about what to do next (unless everything is setup properly)
	if (process.stdout.isTTY && !process.env['BROWSER']) {
		notice()
	}
}
