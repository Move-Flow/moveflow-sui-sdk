import {
  SUI_CLOCK_OBJECT_ID,
  TransactionBlock,
  // Connection,
  // JsonRpcProvider
} from '@mysten/sui.js'
import { Network, Config, getConfig } from './config'

export type FeatureInfo = {
  pauseable: boolean
  senderCloseable: boolean
  recipientModifiable: boolean
}

export type FeeInfo = {
  feeRecipient: string
  feePoint: number
}

export type PauseInfo = {
  paused: boolean
  pausedTime: number
  accPausedTime: number
}

export type StreamInfo = {
  id: string
  coinType: string
  name: string
  remark: string
  sender: string
  recipient: string
  interval: number
  ratePerSecond: number
  lastWithdrawTime: number
  startTime: number
  stopTime: number
  depositAmount: number
  remainingAmount: number
  closed: boolean
  featureInfo: FeatureInfo
  feeInfo: FeeInfo
  pauseInfo: PauseInfo
  balance: number
}


export class Stream {

  private _network: Network

  private _config: Config

  // private _rpcProvider: JsonRpcProvider

  constructor(network: Network) {
    this._network = network
    this._config = getConfig(network)
    // const conn = new Connection({ fullnode: this._config.fullNodeUrl })
    // this._rpcProvider = new JsonRpcProvider(conn)
  }

  get network(): Network {
    return this._network
  }

  get networkName(): string {
    return Network[this._network]
  }

  createPayload(
    coin_type: string,
    name: string,
    remark: string,
    recipient: string,
    deposit_amount: number,
    start_time: number,
    stop_time: number,
    interval = 1000,
    closeable = true,
    modifiable = true
  ): TransactionBlock {
    // TODO add validation of input parameters,
    // such as validity of coin_type length of name and remark, validity of recipient 
    const txb = new TransactionBlock()
    // TODO txb.gas should be replaced with the coin determined by coin_type
    const coins = txb.splitCoins(txb.gas, [txb.pure(deposit_amount)])
    txb.moveCall({
      target: `${this._config.packageObjectId}::stream::create`,
      typeArguments: [coin_type],
      arguments: [
        txb.object(this._config.globalConfigObjectId),
        coins[0],
        txb.pure(name),
        txb.pure(remark),
        txb.pure(recipient),
        txb.pure(deposit_amount),
        txb.pure(start_time),
        txb.pure(stop_time),
        txb.pure(interval),
        txb.pure(closeable),
        txb.pure(modifiable),
        txb.object(SUI_CLOCK_OBJECT_ID),
      ],
    })
    return txb
  }

  // TODO implement more functions
}
