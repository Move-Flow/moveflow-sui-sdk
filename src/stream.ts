import {
  SUI_CLOCK_OBJECT_ID,
  TransactionBlock,
  Connection,
  JsonRpcProvider,
  SuiTransactionBlockResponse,
  ObjectId,
  SuiAddress,
} from '@mysten/sui.js'
import { Network, Config, getConfig } from './config'

export type FeatureInfo = {
  pauseable: boolean
  senderCloseable: boolean
  recipientModifiable: boolean
}

export type FeeInfo = {
  feeRecipient: SuiAddress
  feePoint: number
}

export type PauseInfo = {
  paused: boolean
  pausedAt: number
  accPausedTime: number
}

export type StreamInfo = {
  id: ObjectId
  coinType: string
  name: string
  remark: string
  sender: SuiAddress
  recipient: SuiAddress
  interval: number
  ratePerInterval: number
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

export enum StreamDirection {
  OUT,
  IN
}

export type StreamCreationResult = {
  streamId: string
  senderCap: string
  recipientCap: string
}

type DynamicFields = {
  type: string
  fields: Record<string, any>
}

export class Stream {

  private _network: Network

  private _config: Config

  private _rpcProvider: JsonRpcProvider

  constructor(network: Network) {
    this._network = network
    this._config = getConfig(network)
    const conn = new Connection({ fullnode: this._config.fullNodeUrl })
    this._rpcProvider = new JsonRpcProvider(conn)
  }

  get network(): Network {
    return this._network
  }

  get networkName(): string {
    return Network[this._network]
  }

  createTransaction(
    coinType: string,
    name: string,
    remark: string,
    recipient: SuiAddress,
    depositAmount: number,
    startTime: number,
    stopTime: number,
    interval = 1000,
    closeable = true,
    modifiable = true
  ): TransactionBlock {
    // TODO add validation of input parameters,
    // such as validity of coin_type length of name and remark, validity of recipient
    const txb = new TransactionBlock()
    // TODO txb.gas should be replaced with the coin determined by coin_type
    const coins = txb.splitCoins(txb.gas, [txb.pure(depositAmount)])
    txb.moveCall({
      target: `${this._config.packageObjectId}::stream::create`,
      typeArguments: [coinType],
      arguments: [
        txb.object(this._config.globalConfigObjectId),
        coins[0],
        txb.pure(name),
        txb.pure(remark),
        txb.pure(recipient),
        txb.pure(depositAmount),
        txb.pure(startTime),
        txb.pure(stopTime),
        txb.pure(interval),
        txb.pure(closeable),
        txb.pure(modifiable),
        txb.object(SUI_CLOCK_OBJECT_ID),
      ],
    })
    return txb
  }

  async extendTransaction(
    coinType: string,
    senderCap: ObjectId,
    streamId: ObjectId,
    newStopTime: number
  ): Promise<TransactionBlock> {
    const txb = new TransactionBlock()
    // TODO need to figure out how to get the right coin
    const coins = txb.splitCoins(txb.gas, [txb.pure(100000)])
    txb.moveCall({
      target: `${this._config.packageObjectId}::stream::extend`,
      typeArguments: [coinType],
      arguments: [
        txb.object(senderCap),
        txb.object(streamId),
        coins[0],
        txb.pure(newStopTime),
      ],
    })
    return txb
  }

  pauseTransaction(
    coinType: string,
    senderCap: ObjectId,
    streamId: ObjectId
  ): TransactionBlock {
    const txb = new TransactionBlock()
    txb.moveCall({
      target: `${this._config.packageObjectId}::stream::pause`,
      typeArguments: [coinType],
      arguments: [
        txb.object(senderCap),
        txb.object(streamId),
        txb.object(SUI_CLOCK_OBJECT_ID),
      ],
    })
    return txb
  }

  resumeTransaction(
    coinType: string,
    senderCap: ObjectId,
    streamId: ObjectId
  ): TransactionBlock {
    const txb = new TransactionBlock()
    txb.moveCall({
      target: `${this._config.packageObjectId}::stream::resume`,
      typeArguments: [coinType],
      arguments: [
        txb.object(senderCap),
        txb.object(streamId),
        txb.object(SUI_CLOCK_OBJECT_ID),
      ],
    })
    return txb
  }

  withdrawTransaction(
    coinType: string,
    streamId: ObjectId
  ): TransactionBlock {
    const txb = new TransactionBlock()
    txb.moveCall({
      target: `${this._config.packageObjectId}::stream::withdraw`,
      typeArguments: [coinType],
      arguments: [
        txb.object(streamId),
        txb.object(SUI_CLOCK_OBJECT_ID),
      ],
    })
    return txb
  }

  setNewRecipientTransaction(
    coinType: string,
    streamId: ObjectId,
    newRecipient: SuiAddress
  ): TransactionBlock {
    const txb = new TransactionBlock()
    txb.moveCall({
      target: `${this._config.packageObjectId}::stream::set_new_recipient`,
      typeArguments: [coinType],
      arguments: [
        txb.object(streamId),
        txb.object(this._config.coinConfigsObjectId),
        txb.pure(newRecipient),
      ],
    })
    return txb
  }

  closeTransaction(
    coinType: string,
    senderCap: ObjectId,
    streamId: ObjectId
  ): TransactionBlock {
    const txb = new TransactionBlock()
    txb.moveCall({
      target: `${this._config.packageObjectId}::stream::close`,
      typeArguments: [coinType],
      arguments: [
        txb.object(senderCap),
        txb.object(streamId),
        txb.object(SUI_CLOCK_OBJECT_ID),
      ],
    })
    return txb
  }

  getStreamCreationResult(response: SuiTransactionBlockResponse): StreamCreationResult {
    if (!response.objectChanges) throw new Error('the response is missing object changes')
    let streamId = '', senderCap = '', recipientCap = ''
    for (const objectChange of response.objectChanges) {
      if ('objectType' in objectChange) {
        if (objectChange.objectType.includes('StreamInfo'))
          streamId = objectChange.objectId
        else if (objectChange.objectType.includes('SenderCap'))
          senderCap = objectChange.objectId
        else if (objectChange.objectType.includes('RecipientCap'))
          recipientCap = objectChange.objectId
      }
    }
    const streamCreationResult: StreamCreationResult = {
      streamId,
      senderCap,
      recipientCap,
    }
    return streamCreationResult
  }

  async getStreams(address: SuiAddress, direction: StreamDirection): Promise<StreamInfo[]> {
    const parentId = direction == StreamDirection.IN ? this._config.incomingStreamObjectId : this._config.outgoingStreamObjectId
    const streamIds = await this._rpcProvider.getDynamicFieldObject({
      parentId,
      name: { type: 'address', value: address },
    })
    const streamIdsContent = streamIds.data?.content as DynamicFields
    const streamRecords = await this._rpcProvider.multiGetObjects({
      ids: streamIdsContent.fields.value,
      options: { showContent: true, showOwner: true },
    })
    const streams: StreamInfo[] = []
    for (let i = 0; i < streamRecords.length; i++) {
      const streamRecord = streamRecords[i].data?.content as DynamicFields
      if (
        direction == StreamDirection.IN && streamRecord.fields.recipient == address ||
        direction == StreamDirection.OUT && streamRecord.fields.sender == address
      ) {
        streams.push(this.convert(streamRecord))
      }
    }
    return streams
  }

  private convert(streamRecord: DynamicFields): StreamInfo {
    const streamInfo: StreamInfo = {
      id: streamRecord.fields.id.id,
      coinType: this.extractCoinType(streamRecord.type),
      name: streamRecord.fields.name,
      remark: streamRecord.fields.remark,
      sender: streamRecord.fields.sender,
      recipient: streamRecord.fields.recipient,
      interval: parseInt(streamRecord.fields.interval),
      ratePerInterval: parseInt(streamRecord.fields.rate_per_interval),
      lastWithdrawTime: parseInt(streamRecord.fields.last_withdraw_time),
      startTime: parseInt(streamRecord.fields.start_time),
      stopTime: parseInt(streamRecord.fields.stop_time),
      depositAmount: parseInt(streamRecord.fields.deposit_amount),
      remainingAmount: parseInt(streamRecord.fields.remaining_amount),
      closed: streamRecord.fields.closed,
      featureInfo: {
        pauseable: streamRecord.fields.feature_info.fields.pauseable,
        senderCloseable: streamRecord.fields.feature_info.fields.sender_closeable,
        recipientModifiable: streamRecord.fields.feature_info.fields.recipient_modifiable,
      },
      feeInfo: {
        feeRecipient: streamRecord.fields.fee_info.fields.fee_recipient,
        feePoint: streamRecord.fields.fee_info.fields.fee_point,
      },
      pauseInfo: {
        paused: streamRecord.fields.pauseInfo.fields.paused,
        pausedAt: parseInt(streamRecord.fields.pauseInfo.fields.pause_at),
        accPausedTime: parseInt(streamRecord.fields.pauseInfo.fields.acc_paused_time),
      },
      balance: parseInt(streamRecord.fields.balance),
    }
    return streamInfo

  }

  private extractCoinType(type: string): string {
    const match = type.match(/.+<(.+)>/)
    if (!match) throw new Error('missing coin type')
    return match[1]
  }

  // admin functions
  registerCoinTransaction(
    coinType: string,
    feePoint: number
  ): TransactionBlock {
    const txb = new TransactionBlock()
    txb.moveCall({
      target: `${this._config.packageObjectId}::stream::register_coin`,
      typeArguments: [coinType],
      arguments: [
        txb.object(this._config.manageCap),
        txb.object(this._config.globalConfigObjectId),
        txb.pure(feePoint),
      ],
    })
    return txb
  }

  setFeePointTransaction(
    coinType: string,
    newFeePoint: number
  ): TransactionBlock {
    const txb = new TransactionBlock()
    txb.moveCall({
      target: `${this._config.packageObjectId}::stream::set_fee_point`,
      typeArguments: [coinType],
      arguments: [
        txb.object(this._config.manageCap),
        txb.object(this._config.globalConfigObjectId),
        txb.pure(newFeePoint),
      ],
    })
    return txb
  }

  setFeeRecipientTransaction(
    newFeeRecipient: SuiAddress
  ): TransactionBlock {
    const txb = new TransactionBlock()
    txb.moveCall({
      target: `${this._config.packageObjectId}::stream::set_fee_recipient`,
      arguments: [
        txb.object(this._config.manageCap),
        txb.object(this._config.globalConfigObjectId),
        txb.pure(newFeeRecipient),
      ],
    })
    return txb
  }
}
