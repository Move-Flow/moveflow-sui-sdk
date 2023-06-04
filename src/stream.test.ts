import {
  Ed25519Keypair,
  RawSigner,
  JsonRpcProvider,
  Connection,
} from '@mysten/sui.js'
import { Network, getConfig } from './config'
import { Stream, StreamDirection, StreamCreationResult } from './stream'

describe('Stream', () => {
  const conn = new Connection({ fullnode: getConfig(Network.testnet).fullNodeUrl })
  const rpcProvider = new JsonRpcProvider(conn)
  const path = 'm/44\'/784\'/0\'/0\'/0\''

  // admin address 0x914145bfea385c09095123891f3cbfc36ab98e0ab88fbb985c92319399ddf92e
  const adminMnemonic = 'member gate bicycle bicycle give lobster engine film mango pave critic chat'
  const adminKeypair = Ed25519Keypair.deriveKeypair(adminMnemonic, path)
  const admin = new RawSigner(adminKeypair, rpcProvider)

  // sender address 0x7905ae3ed4a5a77284684fa86fd83c38a9f138b0cc390721c46bca3aaafaf26c
  const senderMnemonic = 'indoor educate spin hour trick faculty indoor grid aware cliff jungle raccoon'
  const senderKeypair = Ed25519Keypair.deriveKeypair(senderMnemonic, path)
  const sender = new RawSigner(senderKeypair, rpcProvider)

  // recipient address 0x45f5a96940e84dd876b1adc2c434961178fc94cb79c23a9f8ddc57c996255869
  const recipientMnemonic = 'evidence paddle silver glance tackle stage solution enlist input canoe say chest'
  const recipientKeypair = Ed25519Keypair.deriveKeypair(recipientMnemonic, path)
  const recipient = new RawSigner(recipientKeypair, rpcProvider)

  // another recipient address 0x08bb80f552385ab82fa689ba24b157ec14860aff6dde76a5cbca00d8e59ad1a3
  const anotherRecipientMnemonic = 'because artist ketchup acoustic merge illness math glide echo coin roast have'
  const anotherRecipientKeypair = Ed25519Keypair.deriveKeypair(anotherRecipientMnemonic, path)
  const anotherRecipient = new RawSigner(anotherRecipientKeypair, rpcProvider)

  const stream = new Stream(Network.unittest)
  let streamCreationResult: StreamCreationResult = {
    streamId: '',
    senderCap: '',
    recipientCap: '',
  }
  const coinType = '0x2::sui::SUI'

  test('createTransaction works', async () => {
    const name = 'first'
    const remark = 'first sui stream'
    const depositAmount = BigInt(10000000)
    const startTime = Math.floor(Date.now() / 1000) - 10
    const duration = 24 * 60 * 60 // 1 day
    const stopTime = startTime + duration
    const interval = 1 // 1 second
    const senderAddress = await sender.getAddress()
    const recipientAddress = await recipient.getAddress()
    const txb = await stream.createTransaction(
      coinType,
      name,
      remark,
      senderAddress,
      recipientAddress,
      depositAmount,
      startTime,
      stopTime,
      interval
    )
    txb.setSender(senderAddress)
    const txBytes = await txb.build({ provider: rpcProvider })
    const response = await sender.signAndExecuteTransactionBlock({
      transactionBlock: txBytes,
      options: {
        showObjectChanges: true,
      },
    })
    streamCreationResult = stream.getStreamCreationResult(response)
    console.log('--- streamCreationResult ---')
    console.log(streamCreationResult)
  })

  test('getStreamById works', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    expect(streamInfo.id).toBe(streamCreationResult.streamId)
  })

  test('extendTransaction works', async () => {
    const duration = 24 * 60 * 60 // 1 day
    const stopTime = Math.floor(Date.now() / 1000) + duration * 2
    const senderAddress = await sender.getAddress()
    const txb = await stream.extendTransaction(
      coinType,
      senderAddress,
      streamCreationResult.senderCap,
      streamCreationResult.streamId,
      stopTime
    )
    txb.setSender(senderAddress)
    txb.setGasBudget(30000000) // otherwise error - not able to determine a budget
    const txBytes = await txb.build({ provider: rpcProvider })
    const response = await sender.signAndExecuteTransactionBlock({
      transactionBlock: txBytes,
      options: {
        showObjectChanges: true,
      },
    })
    console.log('--- extendTransaction Response ---')
    console.log(response)
  })

  test('pauseTransaction works', async () => {
    const txb = stream.pauseTransaction(
      coinType,
      streamCreationResult.senderCap,
      streamCreationResult.streamId
    )
    const senderAddress = await sender.getAddress()
    txb.setSender(senderAddress)
    const txBytes = await txb.build({ provider: rpcProvider })
    const response = await sender.signAndExecuteTransactionBlock({
      transactionBlock: txBytes,
      options: {
        showObjectChanges: true,
      },
    })
    console.log('--- pauseTransaction Response ---')
    console.log(response)
  })

  test('withdrawable should be 0 when stream is paused', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const withdrawable = stream.withdrawable(streamInfo)
    expect(withdrawable).toBe(BigInt(0))
  })

  test('resumeTransaction works', async () => {
    const txb = stream.resumeTransaction(
      coinType,
      streamCreationResult.senderCap,
      streamCreationResult.streamId
    )
    const senderAddress = await sender.getAddress()
    txb.setSender(senderAddress)
    const txBytes = await txb.build({ provider: rpcProvider })
    const response = await sender.signAndExecuteTransactionBlock({
      transactionBlock: txBytes,
      options: {
        showObjectChanges: true,
      },
    })
    console.log('--- resumeTransaction Response ---')
    console.log(response)
  })

  test('withdrawable should be greater than 0 when stream is resumed', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const withdrawable = stream.withdrawable(streamInfo)
    expect(withdrawable).toBeGreaterThan(0)
  })

  test('withdrawTransaction works', async () => {
    const txb = stream.withdrawTransaction(
      coinType,
      streamCreationResult.streamId
    )
    const recipientAddress = await recipient.getAddress()
    txb.setSender(recipientAddress)
    txb.setGasBudget(30000000) // otherwise error - not able to determine a budget
    const txBytes = await txb.build({ provider: rpcProvider })
    const response = await recipient.signAndExecuteTransactionBlock({
      transactionBlock: txBytes,
      options: {
        showObjectChanges: true,
      },
    })
    console.log('--- withdrawTransaction Response ---')
    console.log(response)
  })

  test('setNewRecipientTransaction', async () => {
    const anotherRecipientAddress = await anotherRecipient.getAddress()
    const txb = stream.setNewRecipientTransaction(
      coinType,
      streamCreationResult.streamId,
      anotherRecipientAddress
    )
    const recipientAddress = await recipient.getAddress()
    txb.setSender(recipientAddress)
    txb.setGasBudget(30000000) // otherwise error - not able to determine a budget
    const txBytes = await txb.build({ provider: rpcProvider })
    const response = await recipient.signAndExecuteTransactionBlock({
      transactionBlock: txBytes,
      options: {
        showObjectChanges: true,
      },
    })
    console.log('--- setNewRecipientTransaction Response ---')
    console.log(response)
  })

  test('closeTransaction works', async () => {
    const txb = stream.closeTransaction(
      coinType,
      streamCreationResult.senderCap,
      streamCreationResult.streamId
    )
    const senderAddress = await sender.getAddress()
    txb.setSender(senderAddress)
    const txBytes = await txb.build({ provider: rpcProvider })
    const response = await sender.signAndExecuteTransactionBlock({
      transactionBlock: txBytes,
      options: {
        showObjectChanges: true,
      },
    })
    console.log('--- closeTransaction Response ---')
    console.log(response)
  })

  test('withdrawable should be 0 when stream is closed', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const withdrawable = stream.withdrawable(streamInfo)
    expect(withdrawable).toBe(BigInt(0))
  })

  test('getStreams works', async () => {
    const senderAddress = await sender.getAddress()
    let streams = await stream.getStreams(senderAddress, StreamDirection.OUT)
    console.log(streams)
    const recipientAddress = await recipient.getAddress()
    streams = await stream.getStreams(recipientAddress, StreamDirection.IN)
    console.log('--- getStreams Response ---')
    console.log(streams)
  })

  test('getSenderCaps works', async () => {
    const senderAddress = await sender.getAddress()
    const senderCaps = await stream.getSenderCaps(senderAddress)
    console.log('--- senderCaps ---')
    console.log(senderCaps)
  })

  test('getPaginatedSenderCaps works', async () => {
    const senderAddress = await sender.getAddress()
    const paginatedSenderCaps = await stream.getPaginatedSenderCaps(
      senderAddress,
      { cursor: null }
    )
    console.log('--- paginated senderCaps ---')
    console.log(paginatedSenderCaps)
  })

  test('getRecipientCaps works', async () => {
    const recipientAddress = await recipient.getAddress()
    const recipientCaps = await stream.getRecipientCaps(recipientAddress)
    console.log('--- recipientCaps ---')
    console.log(recipientCaps)
  })

  test('getPaginatedRecipientCaps works', async () => {
    const recipientAddress = await recipient.getAddress()
    const paginatedRecipientCaps = await stream.getPaginatedRecipientCaps(
      recipientAddress,
      { cursor: null }
    )
    console.log('--- paginated recipientCaps ---')
    console.log(paginatedRecipientCaps)
  })

  test('getSupportedCoins works', async () => {
    const coins = await stream.getSupportedCoins()
    console.log('--- coins ---')
    console.log(coins)
  })

  test('getPaginatedSupportedCoins works', async () => {
    const paginatedCoins = await stream.getPaginatedSupportedCoins(
      { cursor: null }
    )
    console.log('--- paginated coins ---')
    console.log(paginatedCoins)
  })

  // ---- admin functions -----

  test('registerCoinTransaction works', async () => {
    const adminAddress = await admin.getAddress()
    const txb = stream.registerCoinTransaction(
      coinType, // TODO replace it with another coin type
      20
    )
    txb.setSender(adminAddress)
    txb.setGasBudget(30000000) // otherwise error - not able to determine a budget
    const txBytes = await txb.build({ provider: rpcProvider })
    const response = await admin.signAndExecuteTransactionBlock({
      transactionBlock: txBytes,
      options: {
        showObjectChanges: true,
      },
    })
    console.log('--- registerCoinTransaction Response ---')
    console.log(response)
  })

  test('setFeePointTransaction works', async () => {
    const adminAddress = await admin.getAddress()
    const txb = stream.setFeePointTransaction(
      coinType,
      10
    )
    txb.setSender(adminAddress)
    const txBytes = await txb.build({ provider: rpcProvider })
    const response = await admin.signAndExecuteTransactionBlock({
      transactionBlock: txBytes,
      options: {
        showObjectChanges: true,
      },
    })
    console.log('--- setFeePointTransaction Response ---')
    console.log(response)
  })

  test('setFeeRecipientTransaction works', async () => {
    const adminAddress = await admin.getAddress()
    const senderAddress = await sender.getAddress()
    const txb = stream.setFeeRecipientTransaction(
      senderAddress
    )
    txb.setSender(adminAddress)
    const txBytes = await txb.build({ provider: rpcProvider })
    const response = await admin.signAndExecuteTransactionBlock({
      transactionBlock: txBytes,
      options: {
        showObjectChanges: true,
      },
    })
    console.log('--- setFeeRecipientTransaction Response ---')
    console.log(response)
  })
})
