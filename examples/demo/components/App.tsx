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
import { sendRenderResult } from 'next/dist/server/send-payload';


function App() {
  const wallet = useWallet();
  const {balance} = useAccountBalance();

  const stream = new Stream(Network.testnet)
  const coinType = '0x2::sui::SUI'

  let streamCreationResult: StreamCreationResult = {
    streamId: '0x226c8f4a2ed2925111d55691cedf99656273ea9f69b08ab00ca76f9bbcb771dd',
    senderCap: '0x61b81b8c916d9f652d9c19a9984e780827816c8366e5f41633077a7f1306560c',
    recipientCap: '0x4b3498023f021161fd9c961660876cf01127e11b598bc2185b9cde4a99624f33',
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
    const startTime = Math.floor(Date.now() / 1000);
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
      1,
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
      streamCreationResult.streamId
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

        {!wallet.connected ? (<p>Connect DApp with Suiet wallet from now!</p>) : (
          <div>
            <div>
              <p>current wallet: {wallet.adapter?.name}</p>
              <p>
                wallet status:{' '}
                { wallet.connecting ? 'connecting' : wallet.connected ? 'connected' : 'disconnected' }
              </p>
              <p>wallet address: {wallet.account?.address}</p>
              <p>current network: {wallet.chain?.name}</p>
              <p>wallet balance: {String(balance)} SUI</p>
              <p>wallet publicKey: {uint8arrayToHex(wallet.account?.publicKey)}</p>
            </div>
            <div className={'btn-group'} style={{margin: '8px 0'}}>
              <button onClick={() => handleCreateStream()}> 
                Send Salary
              </button>

              <button onClick={() => handleWithdrawStream()}> 
                Withdraw Salary
              </button>

              <button onClick={() => handlePauseStream()}> 
                Pause 
              </button>

              <button onClick={() => handleResumeStream()}> 
                Resume
              </button>
              
              <button onClick={() => handleCloseStream()}> 
                Close 
              </button>

              <button onClick={() => handleGetOutgoingStreams()}> 
                Get Outgoing Salary  
              </button>

              <button onClick={() => handleGetIncomingStreams()}> 
                Get incoming Salary
              </button>

              <button onClick={() => getStreambyId()}> 
                Get a Salary
              </button>

              
              <button onClick={() => getDrawableByid()}> 
                Get a Salary 's Withdrawable 
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
