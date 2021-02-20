const Libp2p = require('libp2p')
const WS = require('libp2p-websockets')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')

const PeerId = require('peer-id')
const multiaddr = require('multiaddr')

const { stdinToStream, streamToConsole } = require('./src/stream')

const defaultsDeep = require('@nodeutils/defaults-deep')

async function main () {

  const [idDialer, idListener] = await Promise.all([
    PeerId.createFromJSON(require('./src/peer-id-dialer')),
    PeerId.createFromJSON(require('./src/peer-id-listener'))
  ])

  const options = {
    peerId: idListener,
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/10343']
    },
    modules: {
      transport: [TCP, WS],
      streamMuxer: [MPLEX],
      connEncryption: [NOISE]
    },
  }
  const nodeListener = await Libp2p.create(options)
//  const nodeListener = await Libp2p.create(defaultsDeep(options, defaults))
  await nodeListener.start()

  const optionsDialer = {
    peerId: idDialer,
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    modules: {
      transport: [TCP, WS],
      streamMuxer: [MPLEX],
      connEncryption: [NOISE]
    },
  }
  const nodeDialer = await Libp2p.create(optionsDialer)
  await nodeDialer.start()

  console.log('listener')
  nodeListener.multiaddrs.forEach((ma) => {
    console.log(ma.toString() + '/p2p/' + nodeListener.peerId.toB58String())
  })

  console.log('dialer')
  nodeDialer.multiaddrs.forEach((ma) => {
    console.log(ma.toString() + '/p2p/' + nodeDialer.peerId.toB58String())
  })

  await nodeListener.handle('/chat/1.0.0', async ({ stream }) => {
    console.log('handle /chat/1.0.0', stream);
    // Send stdin to the stream
    stdinToStream(stream)
    // Read the stream and output to console
    streamToConsole(stream)
  })

  const listenerMa = multiaddr(`/ip4/127.0.0.1/tcp/10343/p2p/${nodeListener.peerId.toB58String()}`)
  const { stream } = await nodeDialer.dialProtocol(listenerMa, '/chat/1.0.0')
//   console.log(stream);

//  console.log(nodeListener.peerId);
//  console.log(nodeListener.peerId.toB58String());
//
  // Send stdin to the stream
  stdinToStream(stream)
  // Read the stream and output to console
  streamToConsole(stream)
}

main()
