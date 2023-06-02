import {
  SUI_CLOCK_OBJECT_ID,
  TransactionBlock,
  Connection,
  JsonRpcProvider,
  SuiTransactionBlockResponse,
  ObjectId,
  SuiAddress,
  isValidSuiAddress,
  isValidSuiObjectId,
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
    depositAmount: bigint,
    startTime: number, // seconds
    stopTime: number, // seconds
    interval = 1000, // seconds
    closeable = true,
    modifiable = true
  ): TransactionBlock {
    this.ensureValidCoinType(coinType)
    if (name.length > 1024) throw new Error('name exceeds the maximum length 1024 characters')
    if (remark.length > 1024) throw new Error('remark exceeds the maximum length 1024 characters')
    if (!isValidSuiAddress(recipient)) throw new Error(`${recipient} is not a valid address`)
    if (depositAmount < 0) throw new Error(`${depositAmount} is negative`)
    this.ensureValidTime(startTime)
    this.ensureValidTime(stopTime)
    if (stopTime <= startTime) throw new Error(`stopTime ${stopTime} is before startTime ${startTime}`)
    if (stopTime <= Date.now() / 1000) throw new Error(`stopTime ${stopTime} is in the past`)
    this.ensureValidTime(interval)

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
    this.ensureValidCoinType(coinType)
    if (!isValidSuiObjectId(senderCap)) throw new Error(`${senderCap} is not a valid ObjectId`)
    if (!isValidSuiObjectId(streamId)) throw new Error(`${streamId} is not a valid ObjectId`)
    this.ensureValidTime(newStopTime)
    const streamInfo = await this.getStreamById(streamId)
    if (newStopTime <= streamInfo.stopTime) {
      throw new Error(`newStopTime ${newStopTime} is earlier than the stopTime ${streamInfo.stopTime}`)
    }
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
    this.ensureValidCoinType(coinType)
    if (!isValidSuiObjectId(senderCap)) throw new Error(`${senderCap} is not a valid ObjectId`)
    if (!isValidSuiObjectId(streamId)) throw new Error(`${streamId} is not a valid ObjectId`)
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
    this.ensureValidCoinType(coinType)
    if (!isValidSuiObjectId(senderCap)) throw new Error(`${senderCap} is not a valid ObjectId`)
    if (!isValidSuiObjectId(streamId)) throw new Error(`${streamId} is not a valid ObjectId`)
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
    this.ensureValidCoinType(coinType)
    if (!isValidSuiObjectId(streamId)) throw new Error(`${streamId} is not a valid ObjectId`)
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
    this.ensureValidCoinType(coinType)
    if (!isValidSuiObjectId(streamId)) throw new Error(`${streamId} is not a valid ObjectId`)
    if (!isValidSuiAddress(newRecipient)) throw new Error(` ${newRecipient} is not a valid address`)
    const txb = new TransactionBlock()
    txb.moveCall({
      target: `${this._config.packageObjectId}::stream::set_new_recipient`,
      typeArguments: [coinType],
      arguments: [
        txb.object(streamId),
        txb.object(this._config.globalConfigObjectId),
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
    this.ensureValidCoinType(coinType)
    if (!isValidSuiObjectId(senderCap)) throw new Error(`${senderCap} is not a valid ObjectId`)
    if (!isValidSuiObjectId(streamId)) throw new Error(`${streamId} is not a valid ObjectId`)
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
    if (!isValidSuiAddress(address)) throw new Error(`${address} is not a valid address`)
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

  async getStreamById(id: ObjectId): Promise<StreamInfo> {
    if (!isValidSuiObjectId(id)) throw new Error(`${id} is not a valid ObjectId`)
    const _record = await this._rpcProvider.getObject({
      id,
      options: { showContent: true, showOwner: true },
    })

    const streamInfo = this.convert(_record.data?.content as DynamicFields)
    return streamInfo
  }

  withdrawable(stream: StreamInfo): bigint {
    if (stream.closed || stream.pauseInfo.paused || stream.remainingAmount == 0) {
      return BigInt(0)
    }
    const lastWithdrawTime = stream.lastWithdrawTime
    const stopTime = stream.stopTime
    const interval = stream.interval
    const accPausedTime = stream.pauseInfo.accPausedTime
    const currTime = Date.now() / 1000 // seconds

    const timeSpan = Math.min(currTime, stopTime) - lastWithdrawTime - accPausedTime
    const numOfIntervals = Math.floor(timeSpan / interval)
    const gross = BigInt(numOfIntervals) * BigInt(stream.ratePerInterval) / BigInt(1000)
    const fee = gross * BigInt(stream.feeInfo.feePoint) / BigInt(10000)
    return gross - fee
  }

  async getSenderCaps(owner: SuiAddress) {
    if (!isValidSuiAddress(owner)) throw new Error(`${owner} is not a valid address`)
    // TODO handle pagination properly
    const senderObjects = await this._rpcProvider.getOwnedObjects({
      owner,
      options: { showContent: true },
      filter: {
        StructType: `${this._config.packageObjectId}::stream::SenderCap`,
      },
    })
    return senderObjects
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
    if (!match) throw new Error(`${type} is missing coin type`)
    return match[1]
  }

  private ensurePositiveInteger(num: number) {
    if (num < 0 || !Number.isInteger(num)) {
      throw new Error(`The number ${num} is negative`)
    }
  }

  private ensureValidTime(time: number) {
    this.ensurePositiveInteger(time)
    if (time > 253402300799) { // 9999/12/31 23:59:59
      throw new Error(`The time ${time} is later than 9999/12/31 23:59:59`)
    }
  }

  private ensureValidFeePoint(feePoint: number) {
    this.ensurePositiveInteger(feePoint)
    if (feePoint > 255) {
      throw new Error(`The feePoint ${feePoint} exceeds 255`)
    }
  }

  // basic format validation
  private ensureValidCoinType(coinType: string) {
    const parts = coinType.split('::')
    if (parts.length != 3) throw new Error(`${coinType} is not in a valid format`)
  }

  // ----- admin functions -----

  registerCoinTransaction(
    coinType: string,
    feePoint: number
  ): TransactionBlock {
    this.ensureValidCoinType(coinType)
    this.ensureValidFeePoint(feePoint)
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
    this.ensureValidCoinType(coinType)
    this.ensureValidFeePoint(newFeePoint)
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
