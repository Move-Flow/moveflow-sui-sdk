import {
  Ed25519Keypair,
  RawSigner,
  JsonRpcProvider,
  Connection,
} from '@mysten/sui.js'
import { Network, getConfig } from './config'
import { Stream, StreamDirection, StreamCreationResult } from './stream'

describe('Stream', () => {
  // address 0x7905ae3ed4a5a77284684fa86fd83c38a9f138b0cc390721c46bca3aaafaf26c
  const mnemonic = 'indoor educate spin hour trick faculty indoor grid aware cliff jungle raccoon'
  const path = 'm/44\'/784\'/0\'/0\'/0\''
  const keypair = Ed25519Keypair.deriveKeypair(mnemonic, path)
  const conn = new Connection({ fullnode: getConfig(Network.testnet).fullNodeUrl })
  const rpcProvider = new JsonRpcProvider(conn)
  const signer = new RawSigner(keypair, rpcProvider)
  const stream = new Stream(Network.testnet)
  let streamCreationResult: StreamCreationResult = {
    streamId: '',
    senderCap: '',
    recipientCap: '',
  }
  const coinType = '0x2::sui::SUI'

  test('createTransaction works', async () => {
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
    const gasCost = await signer.getGasCostEstimation({ transactionBlock: txb })
    txb.setGasBudget(gasCost)
    const response = await signer.signAndExecuteTransactionBlock({
      transactionBlock: txb,
      options: {
        showObjectChanges: true,
      },
    })
    streamCreationResult = stream.getStreamCreationResult(response)
    console.log(streamCreationResult)
  })

  test('extendTransaction works', async () => {
    const coinType = '0x2::sui::SUI'
    const duration = 24 * 60 * 60 * 1000 // 1 day
    const stopTime = Date.now() + duration * 2
    const txb = await stream.extendTransaction(
      coinType,
      streamCreationResult.senderCap,
      streamCreationResult.streamId,
      stopTime
    )
    const gasCost = await signer.getGasCostEstimation({ transactionBlock: txb })
    txb.setGasBudget(gasCost)
    const response = await signer.signAndExecuteTransactionBlock({
      transactionBlock: txb,
      options: {
        showObjectChanges: true,
      },
    })
    console.log(response)
  })

  test('pauseTransaction works', async () => {
    const txb = stream.pauseTransaction(
      coinType,
      streamCreationResult.senderCap,
      streamCreationResult.streamId
    )
    const gasCost = await signer.getGasCostEstimation({ transactionBlock: txb })
    txb.setGasBudget(gasCost)
    const response = await signer.signAndExecuteTransactionBlock({
      transactionBlock: txb,
      options: {
        showObjectChanges: true,
      },
    })
    console.log(response)
  })

  test('resumeTransaction works', async () => {
    const txb = stream.resumeTransaction(
      coinType,
      streamCreationResult.senderCap,
      streamCreationResult.streamId
    )
    const gasCost = await signer.getGasCostEstimation({ transactionBlock: txb })
    txb.setGasBudget(gasCost)
    const response = await signer.signAndExecuteTransactionBlock({
      transactionBlock: txb,
      options: {
        showObjectChanges: true,
      },
    })
    console.log(response)
  })

  test('withdrawTransaction works', async () => {
    const txb = stream.withdrawTransaction(
      coinType,
      streamCreationResult.streamId
    )
    const gasCost = await signer.getGasCostEstimation({ transactionBlock: txb })
    txb.setGasBudget(gasCost)
    const response = await signer.signAndExecuteTransactionBlock({
      transactionBlock: txb,
      options: {
        showObjectChanges: true,
      },
    })
    console.log(response)
  })

  test('closeTransaction works', async () => {
    const txb = stream.closeTransaction(
      coinType,
      streamCreationResult.senderCap,
      streamCreationResult.streamId
    )
    const gasCost = await signer.getGasCostEstimation({ transactionBlock: txb })
    txb.setGasBudget(gasCost)
    const response = await signer.signAndExecuteTransactionBlock({
      transactionBlock: txb,
      options: {
        showObjectChanges: true,
      },
    })
    console.log(response)
  })

  test('getStreams works', async () => {
    const address = '0x7905ae3ed4a5a77284684fa86fd83c38a9f138b0cc390721c46bca3aaafaf26c'
    const streams = await stream.getStreams(address, StreamDirection.OUT)
    console.log(streams)
    expect(streams.length).toBeDefined
  })

  // admin functions
  test('registerCoinTransaction works', async () => {
    const txb = stream.registerCoinTransaction(
      coinType, // TODO replace it with another coin type
      100
    )
    const gasCost = await signer.getGasCostEstimation({ transactionBlock: txb })
    txb.setGasBudget(gasCost)
    const response = await signer.signAndExecuteTransactionBlock({
      transactionBlock: txb,
      options: {
        showObjectChanges: true,
      },
    })
    console.log(response)
  })

  test('setFeePointTransaction works', async () => {
    const txb = stream.setFeePointTransaction(
      coinType, // TODO replace it with another coin type
      80
    )
    const gasCost = await signer.getGasCostEstimation({ transactionBlock: txb })
    txb.setGasBudget(gasCost)
    const response = await signer.signAndExecuteTransactionBlock({
      transactionBlock: txb,
      options: {
        showObjectChanges: true,
      },
    })
    console.log(response)
  })

  test('setFeeRecipientTransaction works', async () => {
    const txb = stream.setFeeRecipientTransaction(
      'newFeeRecipient' // TODO replace it with valid address
    )
    const gasCost = await signer.getGasCostEstimation({ transactionBlock: txb })
    txb.setGasBudget(gasCost)
    const response = await signer.signAndExecuteTransactionBlock({
      transactionBlock: txb,
      options: {
        showObjectChanges: true,
      },
    })
    console.log(response)
  })
})
