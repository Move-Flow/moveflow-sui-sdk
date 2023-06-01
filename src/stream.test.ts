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
  const mnemonic = 'future please eager illness dog pitch horror quit use access mom endless'
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
    const recipient = '0xa84b01c05ad237727daacb265fbf8d366d41567f10bb84b0c39056862250dca2'
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
    
    // console.log(streamCreationResult)
  })

  test('pauseTransaction works', async () => {
    const txb = stream.pauseTransaction(
      coinType,
      streamCreationResult.senderCap,
      streamCreationResult.streamId
    )
    const gasCost = await signer.getGasCostEstimation({ transactionBlock: txb })
    txb.setGasBudget(gasCost)
    await signer.signAndExecuteTransactionBlock({
      transactionBlock: txb,
      options: {
        showObjectChanges: true,
      },
    })
    // console.log(response)
  })

  test('resumeTransaction works', async () => {
    const txb = stream.resumeTransaction(
      coinType,
      streamCreationResult.senderCap,
      streamCreationResult.streamId
    )
    const gasCost = await signer.getGasCostEstimation({ transactionBlock: txb })
    txb.setGasBudget(gasCost)
    await signer.signAndExecuteTransactionBlock({
      transactionBlock: txb,
      options: {
        showObjectChanges: true,
      },
    })
    // console.log(response)
  })

  // test('closeTransaction works', async () => {
  //   const txb = stream.closeTransaction(
  //     coinType,
  //     streamCreationResult.senderCap,
  //     streamCreationResult.streamId
  //   )
  //   const gasCost = await signer.getGasCostEstimation({ transactionBlock: txb })
  //   txb.setGasBudget(gasCost)
  //   const response = await signer.signAndExecuteTransactionBlock({
  //     transactionBlock: txb,
  //     options: {
  //       showObjectChanges: true,
  //     },
  //   })
  //   console.log(response)
  // })

  test('getStreams works', async () => {
    const address = '0x7905ae3ed4a5a77284684fa86fd83c38a9f138b0cc390721c46bca3aaafaf26c'
    const streams = await stream.getStreams(address, StreamDirection.OUT)
    // console.log("streams:", streams)
    expect(streams.length).toBeDefined
  })

  
  test('withdrawTransaction works', async () => {
    
    console.log("coinType:", coinType, 'streamCreationResult.streamId:', streamCreationResult.streamId)
    // recipientCap
    // : 
    // "0xb975eff08de65352dfd8003f5db39749947b23eeaf830b8c30b6d68944b25727"
    // senderCap
    // : 
    // "0x21c9a7f7b7a43cc6ba5c91472e6d3b2cc0273cd91a21b33349161238e1039807"
    // streamId
    // : 
    // "0x717c337e09af45d259bd4216dd925dd10ff5f377e2dad06cbee41451cec1d7ca"
    const txb = stream.withdrawTransaction(
      coinType,
      streamCreationResult.streamId
    )
    
    console.log("txb:", txb)
    // const gasCost = await signer.getGasCostEstimation({ transactionBlock: txb })

    // console.log("gasCost:", gasCost)
    console.log("txb:", txb)

    txb.setGasBudget(20000)
    const response = await signer.signAndExecuteTransactionBlock({
      transactionBlock: txb,
      options: {
        showObjectChanges: true,
      },
    })
    console.log(response)
  })


  
  // test('extendTransaction works', async () => {
  //   const coinType = '0x2::sui::SUI'
  //   const duration = 24 * 60 * 60 * 1000 // 1 day
  //   const stopTime = Date.now() + duration * 2
  //   const txb = await stream.extendTransaction(
  //     coinType,
  //     streamCreationResult.senderCap,
  //     streamCreationResult.streamId,
  //     stopTime
  //   )
  //   const gasCost = await signer.getGasCostEstimation({ transactionBlock: txb })
  //   txb.setGasBudget(gasCost)
  //   const response = await signer.signAndExecuteTransactionBlock({
  //     transactionBlock: txb,
  //     options: {
  //       showObjectChanges: true,
  //     },
  //   })
  //   console.log(response)
  // })


  // admin functions
  // test('registerCoinTransaction works', async () => {
  //   const txb = stream.registerCoinTransaction(
  //     coinType, // TODO replace it with another coin type
  //     100
  //   )
  //   const gasCost = await signer.getGasCostEstimation({ transactionBlock: txb })
  //   txb.setGasBudget(gasCost)
  //   const response = await signer.signAndExecuteTransactionBlock({
  //     transactionBlock: txb,
  //     options: {
  //       showObjectChanges: true,
  //     },
  //   })
  //   console.log(response)
  // })

  // test('setFeePointTransaction works', async () => {
  //   const txb = stream.setFeePointTransaction(
  //     coinType, // TODO replace it with another coin type
  //     80
  //   )
  //   const gasCost = await signer.getGasCostEstimation({ transactionBlock: txb })
  //   txb.setGasBudget(gasCost)
  //   const response = await signer.signAndExecuteTransactionBlock({
  //     transactionBlock: txb,
  //     options: {
  //       showObjectChanges: true,
  //     },
  //   })
  //   console.log(response)
  // })

  // test('setFeeRecipientTransaction works', async () => {
  //   const txb = stream.setFeeRecipientTransaction(
  //     'newFeeRecipient' // TODO replace it with valid address
  //   )
  //   const gasCost = await signer.getGasCostEstimation({ transactionBlock: txb })
  //   txb.setGasBudget(gasCost)
  //   const response = await signer.signAndExecuteTransactionBlock({
  //     transactionBlock: txb,
  //     options: {
  //       showObjectChanges: true,
  //     },
  //   })
  //   console.log(response)
  // })
})
