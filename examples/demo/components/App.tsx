import {
  ConnectButton,
  useAccountBalance,
  useWallet,
  SuiChainId, ErrorCode
} from '@suiet/wallet-kit';
import {
  SUI_CLOCK_OBJECT_ID,
  TransactionBlock,
  Connection,
  JsonRpcProvider,
  SuiTransactionBlockResponse,
  ObjectId,
  SuiAddress,
} from '@mysten/sui.js'

import {Stream, StreamDirection, StreamCreationResult } from "@moveflow/sui-sdk.js"
import { Network } from "@moveflow/sui-sdk.js/dist/tsc/config";

import {useMemo, useEffect } from "react";


function App() {
  const wallet = useWallet();
  const {balance} = useAccountBalance();

  const stream = new Stream(Network.testnet)
  const coinType = '0x2::sui::SUI'

  let streamCreationResult: StreamCreationResult = {
    streamId: '0xb82f7e5d3cab6f756514bec94eb50605b9a7a99400e0f0053c470e03f1eb1499',
    senderCap: '',
    recipientCap: '',
  }

  function uint8arrayToHex(value: Uint8Array | undefined) {
    if (!value) return ''
    // @ts-ignore
    return value.toString('hex')
  } 


  async function handleCreateStream() {
   
    const name = 'first'
    const remark = 'first sui stream'
    const recipient = '0xa84b01c05ad237727daacb265fbf8d366d41567f10bb84b0c39056862250dca2'
    const depositAmount = 10000000
    const startTime = Date.parse(new Date() as any)/1000  - 60
    const duration = 24 * 60 * 60 // 1 day
    const stopTime = startTime + duration


    const tx = stream.createTransaction(
      coinType,
      name,
      remark,
      recipient,
      depositAmount,
      startTime,
      stopTime,
    )
    const response = await wallet.signAndExecuteTransactionBlock({
      transactionBlock: tx as any,
    });
    streamCreationResult = stream.getStreamCreationResult(response)

    console.log('streamCreationResult:', streamCreationResult)
    
  }

  async function handleCloseStream() {
    console.log('streamCreationResult:', streamCreationResult)
    
    const tx = stream.closeTransaction(
      coinType,
      streamCreationResult.senderCap,
      streamCreationResult.streamId
    )

    const response = await wallet.signAndExecuteTransactionBlock({
      transactionBlock: tx as any,
    });
    
    console.log('closeStream success', response);

  }
  
  async function handlePauseStream() {
    console.log('streamCreationResult:', streamCreationResult)
    
    const tx = stream.pauseTransaction(
      coinType,
      streamCreationResult.senderCap,
      streamCreationResult.streamId
    )

    const response = await wallet.signAndExecuteTransactionBlock({
      transactionBlock: tx as any,
    });

    console.log('pauseStream success', response);
  }

  async function handleResumeStream() {
    console.log('streamCreationResult:', streamCreationResult)
    const tx = stream.resumeTransaction(
      coinType,
      streamCreationResult.senderCap,
      streamCreationResult.streamId
    )
    const response = await wallet.signAndExecuteTransactionBlock({
      transactionBlock: tx as any,
    });
    console.log('resumeStream success', response);

  }
  
  async function handleWithdrawStream() {

    console.log('streamCreationResult:', streamCreationResult)

    const tx = stream.withdrawTransaction(
      coinType, 
      '0xb82f7e5d3cab6f756514bec94eb50605b9a7a99400e0f0053c470e03f1eb1499' 
    )
    const response = await wallet.signAndExecuteTransactionBlock({
      transactionBlock: tx as any,
    });
    
    console.log('withdrawStream success', response);

  }

  async function handleGetOutgoingStreams() {
    const address = '0xa84b01c05ad237727daacb265fbf8d366d41567f10bb84b0c39056862250dca2'
    const streams = await stream.getStreams(address, StreamDirection.OUT)
    console.log("streams:", streams)
  }

  async function handleGetIncomingStreams() {    
    const address = '0xa84b01c05ad237727daacb265fbf8d366d41567f10bb84b0c39056862250dca2'
    const streams = await stream.getStreams(address, StreamDirection.IN)

    let list = streams.map(m=> {
      return {
        startTime: (new Date(m.startTime * 1000)).toLocaleString() ,
        stoptTime: (new Date(m.stopTime * 1000)).toLocaleString(),
        remainingAmount: m.remainingAmount,
        depositAmount: m.depositAmount,
        withdrawble: stream.withdrawable(m)
      }
    })
    console.log("streams list:", list)
  }

  
  async function getDrawableByid() {    
    const id = '0xb82f7e5d3cab6f756514bec94eb50605b9a7a99400e0f0053c470e03f1eb1499'
    const _stream = await stream.getStreamById(id)

    const _withdrawable = stream.withdrawable(_stream)
    console.log("streams:", _withdrawable)
  }

  async function getStreambyId() {    
    const id = '0xb82f7e5d3cab6f756514bec94eb50605b9a7a99400e0f0053c470e03f1eb1499'
    const streams = await stream.getStreamById(id)
    console.log("streams:", streams)
  }
  
  async function getSenderCap() {    
    const owner = '0xa84b01c05ad237727daacb265fbf8d366d41567f10bb84b0c39056862250dca2'
    const caps = await stream.getSenderCap(owner)
    const list = caps.data.map(m=> { 
      return {
        cap: (m.data?.content as any).fields.id.id, 
        stream: (m.data?.content as any).fields.stream
      }
    })

    console.log("list:", list)
  }
  
  
  return (
    <div className="App">
      <div className="card">
        <ConnectButton
          onConnectError={(error) => {
            if (error.code === ErrorCode.WALLET__CONNECT_ERROR__USER_REJECTED) {
              console.warn('user rejected the connection to ' + error.details?.wallet)
            } else {
              console.warn('unknown connect error: ', error)
            }
          }}
        />

        {!wallet.connected ? (
          <p>Connect DApp with Suiet wallet from now!</p>
        ) : (
          <div>
            <div>
              <p>current wallet: {wallet.adapter?.name}</p>
              <p>
                wallet status:{' '}
                {wallet.connecting
                  ? 'connecting'
                  : wallet.connected
                    ? 'connected'
                    : 'disconnected'}
              </p>
              <p>wallet address: {wallet.account?.address}</p>
              <p>current network: {wallet.chain?.name}</p>
              <p>wallet balance: {String(balance)} SUI</p>
              <p>wallet publicKey: {uint8arrayToHex(wallet.account?.publicKey)}</p>
            </div>
            <div className={'btn-group'} style={{margin: '8px 0'}}>
              <button onClick={() => handleCreateStream()}> 
                Create Stream
              </button>

              <button onClick={() => handleWithdrawStream()}> 
                Withdraw
              </button>

              <button onClick={() => handlePauseStream()}> 
                Pause a Stream
              </button>

              <button onClick={() => handleResumeStream()}> 
                Resume a Stream
              </button>
              
              <button onClick={() => handleCloseStream()}> 
                Close a Stream 
              </button>

              <button onClick={() => handleGetOutgoingStreams()}> 
                Get Outgoing Streams  
              </button>

              <button onClick={() => handleGetIncomingStreams()}> 
                Get incoming Streams
              </button>


              <button onClick={() => getStreambyId()}> 
                Get a Stream
              </button>

              
              <button onClick={() => getDrawableByid()}> 
                Get a Stream 's Withdrawable 
              </button>
              
               <button onClick={() => getSenderCap()}> 
               getSenderCap 
              </button>
              
            </div>
          </div>
        )}
      </div>
      <p className="read-the-docs">
        Click on the Vite and Suiet logos to learn more
      </p>
    </div>
  )
}

export default App;
