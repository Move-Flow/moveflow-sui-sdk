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
  const coinTypes = [
    '0x2::sui::SUI',
    '0x467c38a912a5927b73d1d8f821d30f9c8ad8d87e5228869a79866668938a8b9c::paper_coin::PAPER_COIN',
    'xyz::paper_coin::PAPER_COIN',
    '0x467c38a912a5927b73d1d8f821d30f9c8ad8d87e5228869a79866668938a8b9c::paper_coin',
  ]

  test('constructor works', () => {
    expect(stream.network).toBe(Network.unittest)
    expect(stream.networkName).toBe('unittest')
  })

  // --- createTransaction ---

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
      coinTypes[0],
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

  test('createTransaction should throw error if name is too long', async () => {
    const name = 'first'.repeat(210)
    const remark = 'first sui stream'
    const depositAmount = BigInt(100000)
    const startTime = Math.floor(Date.now() / 1000) - 10
    const duration = 24 * 60 * 60 // 1 day
    const stopTime = startTime + duration
    const interval = 1 // 1 second
    const senderAddress = await sender.getAddress()
    const recipientAddress = await recipient.getAddress()
    await expect(stream.createTransaction(
      coinTypes[0],
      name,
      remark,
      senderAddress,
      recipientAddress,
      depositAmount,
      startTime,
      stopTime,
      interval
    )).rejects.toThrowError(
      'name exceeds the maximum length 1024 characters'
    )
  })

  test('createTransaction should throw error if remark is too long', async () => {
    const name = 'first'
    const remark = 'first sui stream'.repeat(70)
    const depositAmount = BigInt(100000)
    const startTime = Math.floor(Date.now() / 1000) - 10
    const duration = 24 * 60 * 60 // 1 day
    const stopTime = startTime + duration
    const interval = 1 // 1 second
    const senderAddress = await sender.getAddress()
    const recipientAddress = await recipient.getAddress()
    await expect(stream.createTransaction(
      coinTypes[0],
      name,
      remark,
      senderAddress,
      recipientAddress,
      depositAmount,
      startTime,
      stopTime,
      interval
    )).rejects.toThrowError(
      'remark exceeds the maximum length 1024 characters'
    )
  })

  test('createTransaction should throw error if sender address is invalid', async () => {
    const name = 'first'
    const remark = 'first sui stream'
    const depositAmount = BigInt(100000)
    const startTime = Math.floor(Date.now() / 1000) - 10
    const duration = 24 * 60 * 60 // 1 day
    const stopTime = startTime + duration
    const interval = 1 // 1 second
    const senderAddress = 'a-bc_xy'
    const recipientAddress = await recipient.getAddress()
    await expect(stream.createTransaction(
      coinTypes[0],
      name,
      remark,
      senderAddress,
      recipientAddress,
      depositAmount,
      startTime,
      stopTime,
      interval
    )).rejects.toThrowError(
      `${senderAddress} is not a valid address`
    )
  })

  test('createTransaction should throw error if recipient address is invalid', async () => {
    const name = 'first'
    const remark = 'first sui stream'
    const depositAmount = BigInt(100000)
    const startTime = Math.floor(Date.now() / 1000) - 10
    const duration = 24 * 60 * 60 // 1 day
    const stopTime = startTime + duration
    const interval = 1 // 1 second
    const senderAddress = await sender.getAddress()
    const recipientAddress = '02456*'
    await expect(stream.createTransaction(
      coinTypes[0],
      name,
      remark,
      senderAddress,
      recipientAddress,
      depositAmount,
      startTime,
      stopTime,
      interval
    )).rejects.toThrowError(
      `${recipientAddress} is not a valid address`
    )
  })

  test('createTransaction should throw error if stopTime is earlier than startTime', async () => {
    const name = 'first'
    const remark = 'first sui stream'
    const depositAmount = BigInt(100000)
    const startTime = Math.floor(Date.now() / 1000) - 10
    const duration = 24 * 60 * 60 // 1 day
    const stopTime = startTime - duration
    const interval = 1 // 1 second
    const senderAddress = await sender.getAddress()
    const recipientAddress = await recipient.getAddress()
    await expect(stream.createTransaction(
      coinTypes[0],
      name,
      remark,
      senderAddress,
      recipientAddress,
      depositAmount,
      startTime,
      stopTime,
      interval
    )).rejects.toThrowError(
      `stopTime ${stopTime} is before startTime ${startTime}`
    )
  })

  test('createTransaction should throw error if stopTime is in the past', async () => {
    const name = 'first'
    const remark = 'first sui stream'
    const depositAmount = BigInt(100000)
    const startTime = Math.floor(Date.now() / 1000) - 100
    const stopTime = Math.floor(Date.now() / 1000) - 10
    const interval = 1 // 1 second
    const senderAddress = await sender.getAddress()
    const recipientAddress = await recipient.getAddress()
    await expect(stream.createTransaction(
      coinTypes[0],
      name,
      remark,
      senderAddress,
      recipientAddress,
      depositAmount,
      startTime,
      stopTime,
      interval
    )).rejects.toThrowError(
      `stopTime ${stopTime} is in the past`
    )
  })

  test('createTransaction should throw error if depositAmount is too large', async () => {
    const name = 'first'
    const remark = 'first sui stream'
    const depositAmount = BigInt(10 ** 20)
    const startTime = Math.floor(Date.now() / 1000) - 10
    const duration = 24 * 60 * 60 // 1 day
    const stopTime = startTime + duration
    const interval = 1 // 1 second
    const senderAddress = await sender.getAddress()
    const recipientAddress = await recipient.getAddress()
    await expect(stream.createTransaction(
      coinTypes[0],
      name,
      remark,
      senderAddress,
      recipientAddress,
      depositAmount,
      startTime,
      stopTime,
      interval
    )).rejects.toThrowError(
      `the sender ${senderAddress} has not enough balance of ${coinTypes[0]} to pay the deposit ${depositAmount}`
    )
  })

  test('createTransaction should throw error if time is negative', async () => {
    const name = 'first'
    const remark = 'first sui stream'
    const depositAmount = BigInt(10 ** 20)
    const startTime = Math.floor(Date.now() / 1000) - 10
    const duration = 24 * 60 * 60 // 1 day
    const stopTime = startTime + duration
    const interval = -1
    const senderAddress = await sender.getAddress()
    const recipientAddress = await recipient.getAddress()
    await expect(stream.createTransaction(
      coinTypes[0],
      name,
      remark,
      senderAddress,
      recipientAddress,
      depositAmount,
      startTime,
      stopTime,
      interval
    )).rejects.toThrowError(
      `The number ${interval} is negative or not an integer`
    )
  })

  test('createTransaction should throw error if time is not an integer', async () => {
    const name = 'first'
    const remark = 'first sui stream'
    const depositAmount = BigInt(10 ** 20)
    const startTime = Math.floor(Date.now() / 1000) - 9.9
    const duration = 24 * 60 * 60 // 1 day
    const stopTime = startTime + duration
    const interval = 1
    const senderAddress = await sender.getAddress()
    const recipientAddress = await recipient.getAddress()
    await expect(stream.createTransaction(
      coinTypes[0],
      name,
      remark,
      senderAddress,
      recipientAddress,
      depositAmount,
      startTime,
      stopTime,
      interval
    )).rejects.toThrowError(
      `The number ${startTime} is negative or not an integer`
    )
  })

  test('createTransaction should throw error if depositAmount is negative', async () => {
    const name = 'first'
    const remark = 'first sui stream'
    const depositAmount = BigInt(-1)
    const startTime = Math.floor(Date.now() / 1000) - 9.9
    const duration = 24 * 60 * 60 // 1 day
    const stopTime = startTime + duration
    const interval = 1
    const senderAddress = await sender.getAddress()
    const recipientAddress = await recipient.getAddress()
    await expect(stream.createTransaction(
      coinTypes[0],
      name,
      remark,
      senderAddress,
      recipientAddress,
      depositAmount,
      startTime,
      stopTime,
      interval
    )).rejects.toThrowError(
      `depositAmount ${depositAmount} is negative`
    )
  })

  // --- getStreamById ---

  test('getStreamById works', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    expect(streamInfo.id).toBe(streamCreationResult.streamId)
  })

  test('getStreamById throws error if streamId is invalid', async () => {
    const streamId = streamCreationResult.streamId + 'b'
    await expect(stream.getStreamById(streamId)).rejects.toThrowError(
      `${streamId} is not a valid ObjectId`
    )
  })

  // --- extendTransaction ---

  test('extendTransaction works', async () => {
    const duration = 24 * 60 * 60 // 1 day
    const stopTime = Math.floor(Date.now() / 1000) + duration * 2
    const senderAddress = await sender.getAddress()
    const txb = await stream.extendTransaction(
      coinTypes[0],
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

  test('extendTransaction should throw error if sender is not a valid address', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const newStopTime = streamInfo.stopTime + 10
    const senderAddress = 'abcdefg'
    await expect(stream.extendTransaction(
      coinTypes[0],
      senderAddress,
      streamCreationResult.senderCap,
      streamCreationResult.streamId,
      newStopTime
    )).rejects.toThrowError(
      `${senderAddress} is not a valid address`
    )
  })

  test('extendTransaction should throw error if senderCap is not a valid object', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const newStopTime = streamInfo.stopTime + 10
    const senderAddress = await sender.getAddress()
    const senderCap = streamCreationResult.senderCap + '123xyz'
    await expect(stream.extendTransaction(
      coinTypes[0],
      senderAddress,
      senderCap,
      streamCreationResult.streamId,
      newStopTime
    )).rejects.toThrowError(
      `${senderCap} is not a valid ObjectId`
    )
  })

  test('extendTransaction should throw error if streamId is not a valid object', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const newStopTime = streamInfo.stopTime + 10
    const senderAddress = await sender.getAddress()
    const streamId = streamCreationResult.streamId + '1'
    await expect(stream.extendTransaction(
      coinTypes[0],
      senderAddress,
      streamCreationResult.senderCap,
      streamId,
      newStopTime
    )).rejects.toThrowError(
      `${streamId} is not a valid ObjectId`
    )
  })

  test('extendTransaction should throw error if newStopTime earlier than the existing stopTime', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const newStopTime = streamInfo.stopTime - 1
    const senderAddress = await sender.getAddress()
    await expect(stream.extendTransaction(
      coinTypes[0],
      senderAddress,
      streamCreationResult.senderCap,
      streamCreationResult.streamId,
      newStopTime
    )).rejects.toThrowError(
      `newStopTime ${newStopTime} is earlier than the stopTime ${streamInfo.stopTime}`
    )
  })

  test('extendTransaction should throw error if newStopTime is too far away', async () => {
    const newStopTime = 253402300799 + 1
    const senderAddress = await sender.getAddress()
    await expect(stream.extendTransaction(
      coinTypes[0],
      senderAddress,
      streamCreationResult.senderCap,
      streamCreationResult.streamId,
      newStopTime
    )).rejects.toThrowError(
      `The time ${newStopTime} is later than 9999/12/31 23:59:59`
    )
  })

  // --- pauseable ---

  test('the stream is pauseable for the sender', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const senderAddress = await sender.getAddress()
    expect(stream.pauseable(streamInfo, senderAddress)).toBe(true)
  })

  test('the stream is not pauseable for the admin', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const adminAddress = await admin.getAddress()
    expect(stream.pauseable(streamInfo, adminAddress)).toBe(false)
  })

  test('the stream is not pauseable for the recipient', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const recipientAddress = await recipient.getAddress()
    expect(stream.pauseable(streamInfo, recipientAddress)).toBe(false)
  })

  test('the stream is not pauseable for another recipient', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const anotherRecipientAddress = await anotherRecipient.getAddress()
    expect(stream.pauseable(streamInfo, anotherRecipientAddress)).toBe(false)
  })

  // --- pauseTransaction ---

  test('pauseTransaction works', async () => {
    const txb = stream.pauseTransaction(
      coinTypes[0],
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

  test('pauseTransaction should throw error if the senderCap is not valid', () => {
    const senderCap = streamCreationResult.senderCap + 'a'
    expect(() => stream.pauseTransaction(
      coinTypes[0],
      senderCap,
      streamCreationResult.streamId
    )).toThrowError(
      `${senderCap} is not a valid ObjectId`
    )
  })

  test('pauseTransaction should throw error if the streamId is not valid', () => {
    const streamId = streamCreationResult.streamId + 'a'
    expect(() => stream.pauseTransaction(
      coinTypes[0],
      streamCreationResult.senderCap,
      streamId
    )).toThrowError(
      `${streamId} is not a valid ObjectId`
    )
  })

  // --- pauseable ---

  test('the stream is not pauseable for the sender', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const senderAddress = await sender.getAddress()
    expect(stream.pauseable(streamInfo, senderAddress)).toBe(false)
  })

  test('the stream is not pauseable for the admin', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const adminAddress = await admin.getAddress()
    expect(stream.pauseable(streamInfo, adminAddress)).toBe(false)
  })

  test('the stream is not pauseable for the recipient', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const recipientAddress = await recipient.getAddress()
    expect(stream.pauseable(streamInfo, recipientAddress)).toBe(false)
  })

  test('the stream is not pauseable for another recipient', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const anotherRecipientAddress = await anotherRecipient.getAddress()
    expect(stream.pauseable(streamInfo, anotherRecipientAddress)).toBe(false)
  })

  // --- withdrawable ---

  test('withdrawable should be 0 when stream is paused', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const withdrawable = stream.withdrawable(streamInfo)
    expect(withdrawable).toBe(BigInt(0))
  })

  // --- resumeTransaction ---

  test('resumeTransaction works', async () => {
    const txb = stream.resumeTransaction(
      coinTypes[0],
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

  test('resumeTransaction should throw error if the senderCap is not valid', () => {
    const senderCap = streamCreationResult.senderCap + 'a'
    expect(() => stream.resumeTransaction(
      coinTypes[0],
      senderCap,
      streamCreationResult.streamId
    )).toThrowError(
      `${senderCap} is not a valid ObjectId`
    )
  })

  test('resumeTransaction should throw error if the streamId is not valid', () => {
    const streamId = streamCreationResult.streamId + 'a'
    expect(() => stream.resumeTransaction(
      coinTypes[0],
      streamCreationResult.senderCap,
      streamId
    )).toThrowError(
      `${streamId} is not a valid ObjectId`
    )
  })

  // --- pauseable ---

  test('the stream is pauseable for the sender', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const senderAddress = await sender.getAddress()
    expect(stream.pauseable(streamInfo, senderAddress)).toBe(true)
  })

  test('the stream is not pauseable for the admin', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const adminAddress = await admin.getAddress()
    expect(stream.pauseable(streamInfo, adminAddress)).toBe(false)
  })

  test('the stream is not pauseable for the recipient', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const recipientAddress = await recipient.getAddress()
    expect(stream.pauseable(streamInfo, recipientAddress)).toBe(false)
  })

  test('the stream is not pauseable for another recipient', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const anotherRecipientAddress = await anotherRecipient.getAddress()
    expect(stream.pauseable(streamInfo, anotherRecipientAddress)).toBe(false)
  })

  // --- closeable ---

  test('the stream is closeable for the sender', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const senderAddress = await sender.getAddress()
    expect(stream.closeable(streamInfo, senderAddress)).toBe(true)
  })

  test('the stream is not closeable for the admin', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const adminAddress = await admin.getAddress()
    expect(stream.closeable(streamInfo, adminAddress)).toBe(false)
  })

  test('the stream is not closeable for the recipient', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const recipientAddress = await recipient.getAddress()
    expect(stream.closeable(streamInfo, recipientAddress)).toBe(false)
  })

  test('the stream is not closeable for another recipient', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const anotherRecipientAddress = await anotherRecipient.getAddress()
    expect(stream.closeable(streamInfo, anotherRecipientAddress)).toBe(false)
  })

  // --- recipientModifiable ---

  test('the stream is not recipientModifiable for the sender', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const senderAddress = await sender.getAddress()
    expect(stream.recipientModifiable(streamInfo, senderAddress)).toBe(false)
  })

  test('the stream is not recipientModifiable for the admin', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const adminAddress = await admin.getAddress()
    expect(stream.recipientModifiable(streamInfo, adminAddress)).toBe(false)
  })

  test('the stream is recipientModifiable for the recipient', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const recipientAddress = await recipient.getAddress()
    expect(stream.recipientModifiable(streamInfo, recipientAddress)).toBe(true)
  })

  test('the stream is not recipientModifiable for another recipient', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const anotherRecipientAddress = await anotherRecipient.getAddress()
    expect(stream.recipientModifiable(streamInfo, anotherRecipientAddress)).toBe(false)
  })

  // --- withdrawable ---

  test('withdrawable should be greater than 0 when stream is resumed', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const withdrawable = stream.withdrawable(streamInfo)
    expect(withdrawable).toBeGreaterThan(0)
  })

  // --- withdrawTransaction ---

  test('withdrawTransaction works', async () => {
    const txb = stream.withdrawTransaction(
      coinTypes[0],
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

  test('withdrawTransaction should throw error if the streamId is not valid', () => {
    const streamId = streamCreationResult.streamId + 'a'
    expect(() => stream.withdrawTransaction(
      coinTypes[0],
      streamId
    )).toThrowError(
      `${streamId} is not a valid ObjectId`
    )
  })

  // --- setNewRecipientTransaction ---

  test('setNewRecipientTransaction works', async () => {
    const anotherRecipientAddress = await anotherRecipient.getAddress()
    const txb = stream.setNewRecipientTransaction(
      coinTypes[0],
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

  test('setNewRecipientTransaction should throw error if the streamId is not valid', async () => {
    const anotherRecipientAddress = await anotherRecipient.getAddress()
    const streamId = streamCreationResult.streamId + 'a'
    expect(() => stream.setNewRecipientTransaction(
      coinTypes[0],
      streamId,
      anotherRecipientAddress
    )).toThrowError(
      `${streamId} is not a valid ObjectId`
    )
  })

  test('setNewRecipientTransaction should throw error if the newRecipient is not valid', async () => {
    const anotherRecipientAddress = await anotherRecipient.getAddress() + 'x'
    expect(() => stream.setNewRecipientTransaction(
      coinTypes[0],
      streamCreationResult.streamId,
      anotherRecipientAddress
    )).toThrowError(
      `${anotherRecipientAddress} is not a valid address`
    )
  })

  // --- recipientModifiable ---

  test('the stream is not recipientModifiable for the sender', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const senderAddress = await sender.getAddress()
    expect(stream.recipientModifiable(streamInfo, senderAddress)).toBe(false)
  })

  test('the stream is not recipientModifiable for the admin', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const adminAddress = await admin.getAddress()
    expect(stream.recipientModifiable(streamInfo, adminAddress)).toBe(false)
  })

  test('the stream is not recipientModifiable for the recipient', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const recipientAddress = await recipient.getAddress()
    expect(stream.recipientModifiable(streamInfo, recipientAddress)).toBe(false)
  })

  test('the stream is recipientModifiable for another recipient', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const anotherRecipientAddress = await anotherRecipient.getAddress()
    expect(stream.recipientModifiable(streamInfo, anotherRecipientAddress)).toBe(true)
  })

  // --- closeTransaction ---

  test('closeTransaction works', async () => {
    const txb = stream.closeTransaction(
      coinTypes[0],
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

  test('closeTransaction should throw error if the senderCap is not valid', () => {
    const senderCap = streamCreationResult.senderCap + 'a'
    expect(() => stream.closeTransaction(
      coinTypes[0],
      senderCap,
      streamCreationResult.streamId
    )).toThrowError(
      `${senderCap} is not a valid ObjectId`
    )
  })

  test('closeTransaction should throw error if the streamId is not valid', () => {
    const streamId = streamCreationResult.streamId + 'a'
    expect(() => stream.closeTransaction(
      coinTypes[0],
      streamCreationResult.senderCap,
      streamId
    )).toThrowError(
      `${streamId} is not a valid ObjectId`
    )
  })

  // --- pauseable ---

  test('the stream is not pauseable for the sender', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const senderAddress = await sender.getAddress()
    expect(stream.pauseable(streamInfo, senderAddress)).toBe(false)
  })

  test('the stream is not pauseable for the admin', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const adminAddress = await admin.getAddress()
    expect(stream.pauseable(streamInfo, adminAddress)).toBe(false)
  })

  test('the stream is not pauseable for the recipient', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const recipientAddress = await recipient.getAddress()
    expect(stream.pauseable(streamInfo, recipientAddress)).toBe(false)
  })

  test('the stream is not pauseable for another recipient', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const anotherRecipientAddress = await anotherRecipient.getAddress()
    expect(stream.pauseable(streamInfo, anotherRecipientAddress)).toBe(false)
  })

  // --- closeable ---

  test('the stream is not closeable for the sender', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const senderAddress = await sender.getAddress()
    expect(stream.closeable(streamInfo, senderAddress)).toBe(false)
  })

  test('the stream is not closeable for the admin', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const adminAddress = await admin.getAddress()
    expect(stream.closeable(streamInfo, adminAddress)).toBe(false)
  })

  test('the stream is not closeable for the recipient', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const recipientAddress = await recipient.getAddress()
    expect(stream.closeable(streamInfo, recipientAddress)).toBe(false)
  })

  test('the stream is not closeable for another recipient', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const anotherRecipientAddress = await anotherRecipient.getAddress()
    expect(stream.closeable(streamInfo, anotherRecipientAddress)).toBe(false)
  })

  // --- recipientModifiable ---

  test('the stream is not recipientModifiable for the sender', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const senderAddress = await sender.getAddress()
    expect(stream.recipientModifiable(streamInfo, senderAddress)).toBe(false)
  })

  test('the stream is not recipientModifiable for the admin', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const adminAddress = await admin.getAddress()
    expect(stream.recipientModifiable(streamInfo, adminAddress)).toBe(false)
  })

  test('the stream is not recipientModifiable for the recipient', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const recipientAddress = await recipient.getAddress()
    expect(stream.recipientModifiable(streamInfo, recipientAddress)).toBe(false)
  })

  test('the stream is not recipientModifiable for another recipient', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const anotherRecipientAddress = await anotherRecipient.getAddress()
    expect(stream.recipientModifiable(streamInfo, anotherRecipientAddress)).toBe(false)
  })

  // --- withdrawable ---

  test('withdrawable should be 0 when stream is closed', async () => {
    const streamInfo = await stream.getStreamById(streamCreationResult.streamId)
    const withdrawable = stream.withdrawable(streamInfo)
    expect(withdrawable).toBe(BigInt(0))
  })

  // --- getStreams ---

  test('getStreams works', async () => {
    const senderAddress = await sender.getAddress()
    let streams = await stream.getStreams(senderAddress, StreamDirection.OUT)
    console.log(streams)
    const recipientAddress = await recipient.getAddress()
    streams = await stream.getStreams(recipientAddress, StreamDirection.IN)
    console.log('--- getStreams Response ---')
    console.log(streams)
  })

  test('getStreams throws error is the address is invalid', async () => {
    const senderAddress = await sender.getAddress() + 'a'
    await expect(stream.getStreams(senderAddress, StreamDirection.OUT)).rejects.toThrowError(
      `${senderAddress} is not a valid address`
    )
  })

  // --- getSenderCaps ---

  test('getSenderCaps works', async () => {
    const senderAddress = await sender.getAddress()
    const senderCaps = await stream.getSenderCaps(senderAddress)
    console.log('--- senderCaps ---')
    console.log(senderCaps)
  })

  test('getSenderCaps throws error if the address is invalid', async () => {
    const senderAddress = await sender.getAddress() + 'c'
    await expect(stream.getSenderCaps(senderAddress)).rejects.toThrowError(
      `${senderAddress} is not a valid address`
    )
  })

  // --- getPaginatedSenderCaps ---

  test('getPaginatedSenderCaps works', async () => {
    const senderAddress = await sender.getAddress()
    const paginatedSenderCaps = await stream.getPaginatedSenderCaps(
      senderAddress,
      { cursor: null }
    )
    console.log('--- paginated senderCaps ---')
    console.log(paginatedSenderCaps)
  })

  test('getPaginatedSenderCaps throws error if the address is invalid', async () => {
    const senderAddress = await sender.getAddress() + 'd'
    await expect(stream.getPaginatedSenderCaps(
      senderAddress,
      { cursor: null }
    )).rejects.toThrowError(
      `${senderAddress} is not a valid address`
    )
  })

  // --- getRecipientCaps ---

  test('getRecipientCaps works', async () => {
    const recipientAddress = await recipient.getAddress()
    const recipientCaps = await stream.getRecipientCaps(recipientAddress)
    console.log('--- recipientCaps ---')
    console.log(recipientCaps)
  })

  // --- getPaginatedRecipientCaps ---

  test('getPaginatedRecipientCaps works', async () => {
    const recipientAddress = await recipient.getAddress()
    const paginatedRecipientCaps = await stream.getPaginatedRecipientCaps(
      recipientAddress,
      { cursor: null }
    )
    console.log('--- paginated recipientCaps ---')
    console.log(paginatedRecipientCaps)
  })

  // --- getSupportedCoins ---

  test('getSupportedCoins works', async () => {
    const coins = await stream.getSupportedCoins()
    console.log('--- coins ---')
    console.log(coins)
  })

  // --- getPaginatedSupportedCoins ---

  test('getPaginatedSupportedCoins works', async () => {
    const paginatedCoins = await stream.getPaginatedSupportedCoins(
      { cursor: null }
    )
    console.log('--- paginated coins ---')
    console.log(paginatedCoins)
  })

  /* **** admin functions **** */

  // --- registerCoinTransaction ---

  test('registerCoinTransaction works', async () => {
    const adminAddress = await admin.getAddress()
    const txb = stream.registerCoinTransaction(
      coinTypes[1],
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

  test('registerCoinTransaction throws error if coin type is invalid', () => {
    const feePoint = 255
    expect(() => stream.registerCoinTransaction(
      coinTypes[2],
      feePoint
    )).toThrow(
      `${coinTypes[2]} is not in a valid format`
    )
  })

  test('registerCoinTransaction throws error if coin type is invalid', () => {
    const feePoint = 255
    expect(() => stream.registerCoinTransaction(
      coinTypes[3],
      feePoint
    )).toThrow(
      `${coinTypes[3]} is not in a valid format`
    )
  })

  test('registerCoinTransaction throws error if fee point is too large', () => {
    const feePoint = 256
    expect(() => stream.registerCoinTransaction(
      coinTypes[1],
      feePoint
    )).toThrow(
      `The feePoint ${feePoint} exceeds 255`
    )
  })

  test('registerCoinTransaction throws error if fee point is negative', () => {
    const feePoint = -1
    expect(() => stream.registerCoinTransaction(
      coinTypes[1],
      feePoint
    )).toThrow(
      `The number ${feePoint} is negative or not an integer`
    )
  })

  test('registerCoinTransaction throws error if fee point not an integer', () => {
    const feePoint = 8.8
    expect(() => stream.registerCoinTransaction(
      coinTypes[1],
      feePoint
    )).toThrow(
      `The number ${feePoint} is negative or not an integer`
    )
  })

  // --- setFeePointTransaction ---

  test('setFeePointTransaction works', async () => {
    const adminAddress = await admin.getAddress()
    const txb = stream.setFeePointTransaction(
      coinTypes[0],
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

  test('setFeePointTransaction throws error if fee point is too large', () => {
    const feePoint = 256
    expect(() => stream.setFeePointTransaction(
      coinTypes[1],
      feePoint
    )).toThrow(
      `The feePoint ${feePoint} exceeds 255`
    )
  })

  test('setFeePointTransaction throws error if fee point is negative', () => {
    const feePoint = -1
    expect(() => stream.setFeePointTransaction(
      coinTypes[1],
      feePoint
    )).toThrow(
      `The number ${feePoint} is negative or not an integer`
    )
  })

  test('setFeePointTransaction throws error if fee point not an integer', () => {
    const feePoint = 8.8
    expect(() => stream.setFeePointTransaction(
      coinTypes[1],
      feePoint
    )).toThrow(
      `The number ${feePoint} is negative or not an integer`
    )
  })

  // --- setFeeRecipientTransaction ---

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

  test('setFeeRecipientTransaction throws error if the address is invalid', async () => {
    const senderAddress = await sender.getAddress() + 'd'
    expect(() => stream.setFeeRecipientTransaction(
      senderAddress
    )).toThrowError(
      `${senderAddress} is not a valid address`
    )
  })

  /* **** end of Admin functions **** */

  // below are the non-gas coin test cases

  test('createTransaction works for a non-gas coin type - no need to merge coins', async () => {
    const name = 'second'
    const remark = 'paper_coin stream'
    const depositAmount = BigInt(10000)
    const startTime = Math.floor(Date.now() / 1000) - 10
    const duration = 24 * 60 * 60 // 1 day
    const stopTime = startTime + duration
    const senderAddress = await sender.getAddress()
    const recipientAddress = await recipient.getAddress()
    const txb = await stream.createTransaction(
      coinTypes[1], // PAPER_COIN
      name,
      remark,
      senderAddress,
      recipientAddress,
      depositAmount,
      startTime,
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
    console.log('--- createTransaction response ---')
    console.log(response)
    streamCreationResult = stream.getStreamCreationResult(response)
    console.log('--- streamCreationResult ---')
    console.log(streamCreationResult)
  })

  test('createTransaction works for a non-gas coin type - need to merge coins', async () => {
    const name = 'second'
    const remark = 'paper_coin stream'
    const depositAmount = BigInt(200 * 10**8) // 200 PAPER_COIN
    const startTime = Math.floor(Date.now() / 1000) - 10
    const duration = 24 * 60 * 60 // 1 day
    const stopTime = startTime + duration
    const interval = 1 // 1 second
    const senderAddress = await sender.getAddress()
    const recipientAddress = await recipient.getAddress()
    const txb = await stream.createTransaction(
      coinTypes[1], // PAPER_COIN
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
    txb.setGasBudget(30000000) // otherwise error - not able to determine a budget
    const txBytes = await txb.build({ provider: rpcProvider })
    const response = await sender.signAndExecuteTransactionBlock({
      transactionBlock: txBytes,
      options: {
        showObjectChanges: true,
      },
    })
    console.log('--- createTransaction response ---')
    console.log(response)
    streamCreationResult = stream.getStreamCreationResult(response)
    console.log('--- streamCreationResult ---')
    console.log(streamCreationResult)
  })

  test('extendTransaction works for a non-gas coin type', async () => {
    const duration = 24 * 60 * 60 // 1 day
    const stopTime = Math.floor(Date.now() / 1000) + duration * 2
    const senderAddress = await sender.getAddress()
    const txb = await stream.extendTransaction(
      coinTypes[1],
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

  test('pauseTransaction works for a non-gas coin type', async () => {
    const txb = stream.pauseTransaction(
      coinTypes[1],
      streamCreationResult.senderCap,
      streamCreationResult.streamId
    )
    const senderAddress = await sender.getAddress()
    txb.setSender(senderAddress)
    txb.setGasBudget(30000000) // otherwise error - not able to determine a budget
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

  test('resumeTransaction works for a non-gas coin type', async () => {
    const txb = stream.resumeTransaction(
      coinTypes[1],
      streamCreationResult.senderCap,
      streamCreationResult.streamId
    )
    const senderAddress = await sender.getAddress()
    txb.setSender(senderAddress)
    txb.setGasBudget(30000000) // otherwise error - not able to determine a budget
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

  test('withdrawTransaction works for a non-gas coin type', async () => {
    const txb = stream.withdrawTransaction(
      coinTypes[1],
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

  test('setNewRecipientTransaction works for a non-gas coin type', async () => {
    const anotherRecipientAddress = await anotherRecipient.getAddress()
    const txb = stream.setNewRecipientTransaction(
      coinTypes[1],
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

  test('closeTransaction works for a non-gas coin type', async () => {
    const txb = stream.closeTransaction(
      coinTypes[1],
      streamCreationResult.senderCap,
      streamCreationResult.streamId
    )
    const senderAddress = await sender.getAddress()
    txb.setSender(senderAddress)
    txb.setGasBudget(30000000) // otherwise error - not able to determine a budget
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
})
