import {
  Ed25519Keypair,
  RawSigner,
  JsonRpcProvider,
  Connection,
} from '@mysten/sui.js'
import { Network, getConfig } from './config'
import { Stream, StreamDirection } from './stream'

describe('Stream', () => {
  // address 0x7905ae3ed4a5a77284684fa86fd83c38a9f138b0cc390721c46bca3aaafaf26c
  const mnemonic = 'indoor educate spin hour trick faculty indoor grid aware cliff jungle raccoon'
  const path = 'm/44\'/784\'/0\'/0\'/0\''
  const keypair = Ed25519Keypair.deriveKeypair(mnemonic, path)
  const conn = new Connection({ fullnode: getConfig(Network.testnet).fullNodeUrl })
  const rpcProvider = new JsonRpcProvider(conn)
  const signer = new RawSigner(keypair, rpcProvider)
  const stream = new Stream(Network.testnet)

  test('createTransaction works', async () => {
    const coinType = '0x2::sui::SUI'
    const name = 'first'
    const remark = 'first sui stream'
    const recipient = '0x79ae5e363c3f87bac4661795e28753e13a5913f9f94bb2027e69d08782b1b4a4'
    const depositAmount = 10000000
    const startTime = Date.now() - 1000 * 60
    const duration = 24 * 60 * 60 * 1000 // 1 day
    const stopTime = startTime + duration
    const txb = stream.createTransaction(
      coinType,
      name,
      remark,
      recipient,
      depositAmount,
      startTime,
      stopTime
    )
    txb.setGasBudget(300000000)
    const response = await signer.signAndExecuteTransactionBlock({
      transactionBlock: txb,
      options: {
        showObjectChanges: true,
      },
    })
    const streamCreationResult = stream.getStreamCreationResult(response)
    console.log(streamCreationResult)
  })

  test('getStreams works', async () => {
    const address = '0x7905ae3ed4a5a77284684fa86fd83c38a9f138b0cc390721c46bca3aaafaf26c'
    const streams = await stream.getStreams(address, StreamDirection.OUT)
    console.log(streams)
    expect(streams.length).toBeGreaterThan(0)
  })
})
