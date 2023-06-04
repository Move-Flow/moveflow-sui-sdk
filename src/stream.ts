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
  normalizeSuiObjectId,
  TransactionArgument,
  PaginationArguments,
  PaginatedObjectsResponse
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

export type CoinConfig = {
  coinType: string
  feePoint: number
}

export type PaginatedCoinConfigs = {
  coinConfigs: CoinConfig[],
  nextCursor: string | null,
  hasNextPage: boolean
}

export type PaginatedObjectIds = {
  objectIds: ObjectId[],
  nextCursor: PaginatedObjectsResponse['nextCursor'],
  hasNextPage: boolean
}

type DynamicFields = {
  type: string
  fields: Record<string, any>
}

export class Stream {

  private _network: Network

  private _config: Config

  private _rpcProvider: JsonRpcProvider

  private readonly SUI: string = this.normalizeCoinType('0x2::sui::SUI')

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

  async createTransaction(
    coinType: string,
    name: string,
    remark: string,
    sender: SuiAddress,
    recipient: SuiAddress,
    depositAmount: bigint,
    startTime: number, // seconds
    stopTime: number, // seconds
    interval = 1000, // seconds
    closeable = true,
    modifiable = true
  ): Promise<TransactionBlock> {
    this.ensureValidCoinType(coinType)
    if (name.length > 1024) throw new Error('name exceeds the maximum length 1024 characters')
    if (remark.length > 1024) throw new Error('remark exceeds the maximum length 1024 characters')
    if (!isValidSuiAddress(sender)) throw new Error(`${sender} is not a valid address`)
    if (!isValidSuiAddress(recipient)) throw new Error(`${recipient} is not a valid address`)
    if (depositAmount < 0) throw new Error(`${depositAmount} is negative`)
    this.ensureValidTime(startTime)
    this.ensureValidTime(stopTime)
    if (stopTime <= startTime) throw new Error(`stopTime ${stopTime} is before startTime ${startTime}`)
    if (stopTime <= Date.now() / 1000) throw new Error(`stopTime ${stopTime} is in the past`)
    this.ensureValidTime(interval)

    const isSUI = this.isSUI(coinType)
    const balance = await this._rpcProvider.getBalance({ owner: sender, coinType })
    const totalBalance = BigInt(balance.totalBalance)
    const lockedBalance = balance.lockedBalance.number ? BigInt(balance.lockedBalance.number) : BigInt(0)
    const availableBalance = totalBalance - lockedBalance
    if (isSUI && availableBalance <= depositAmount || !isSUI && totalBalance < depositAmount) {
      throw new Error(`the sender ${sender} has not enough balance of ${coinType} to pay the deposit ${depositAmount}`)
    }
    const txb = new TransactionBlock()
    const coin = await this.getCoin(txb, sender, coinType, depositAmount)
    txb.moveCall({
      target: `${this._config.packageObjectId}::stream::create`,
      typeArguments: [coinType],
      arguments: [
        txb.object(this._config.globalConfigObjectId),
        coin,
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
    sender: SuiAddress,
    senderCap: ObjectId,
    streamId: ObjectId,
    newStopTime: number
  ): Promise<TransactionBlock> {
    this.ensureValidCoinType(coinType)
    if (!isValidSuiAddress(sender)) throw new Error(`${sender} is not a valid address`)
    if (!isValidSuiObjectId(senderCap)) throw new Error(`${senderCap} is not a valid ObjectId`)
    if (!isValidSuiObjectId(streamId)) throw new Error(`${streamId} is not a valid ObjectId`)
    this.ensureValidTime(newStopTime)
    const streamInfo = await this.getStreamById(streamId)
    if (newStopTime <= streamInfo.stopTime) {
      throw new Error(`newStopTime ${newStopTime} is earlier than the stopTime ${streamInfo.stopTime}`)
    }

    const txb = new TransactionBlock()
    const numOfIntervals = (newStopTime - streamInfo.stopTime) / streamInfo.interval
    const depositAmount: bigint = BigInt(Math.ceil(streamInfo.ratePerInterval * numOfIntervals / 1000))
    const coin = await this.getCoin(txb, sender, coinType, depositAmount)
    txb.moveCall({
      target: `${this._config.packageObjectId}::stream::extend`,
      typeArguments: [coinType],
      arguments: [
        txb.object(senderCap),
        txb.object(streamId),
        coin,
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

  // use this function if there aren't many (over 100) senderCaps
  async getSenderCaps(owner: SuiAddress): Promise<ObjectId[]> {
    return this.getOwnedObjects(owner, `${this._config.packageObjectId}::stream::SenderCap`)
  }

  // use this function if there are many (over 100) senderCaps
  async getPaginatedSenderCaps(
    owner: SuiAddress,
    paginationArguments: PaginationArguments<PaginatedObjectsResponse['nextCursor']>
  ): Promise<PaginatedObjectIds> {
    return this.getPaginatedOwnedObjects(
      owner,
      `${this._config.packageObjectId}::stream::SenderCap`,
      paginationArguments
    )
  }

  // use this function if there aren't many (over 100) recipientCaps
  async getRecipientCaps(owner: SuiAddress): Promise<ObjectId[]> {
    return this.getOwnedObjects(owner, `${this._config.packageObjectId}::stream::RecipientCap`)
  }


  // use this function if there are many (over 100) recipientCaps
  async getPaginatedRecipientCaps(
    owner: SuiAddress,
    paginationArguments: PaginationArguments<PaginatedObjectsResponse['nextCursor']>
  ): Promise<PaginatedObjectIds> {
    return this.getPaginatedOwnedObjects(
      owner,
      `${this._config.packageObjectId}::stream::RecipientCap`,
      paginationArguments
    )
  }

  private async getOwnedObjects(owner: SuiAddress, structType: string): Promise<ObjectId[]> {
    if (!isValidSuiAddress(owner)) throw new Error(`${owner} is not a valid address`)
    const objectIds: ObjectId[] = []
    let hasNextPage = true
    let nextCursor = null
    while (hasNextPage) {
      const paginatedOwnedObjects = await this.getPaginatedOwnedObjects(
        owner,
        structType,
        { cursor: nextCursor }
      )
      objectIds.push(...paginatedOwnedObjects.objectIds)
      hasNextPage = paginatedOwnedObjects.hasNextPage
      nextCursor = paginatedOwnedObjects.nextCursor
    }
    return objectIds
  }

  private async getPaginatedOwnedObjects(
    owner: SuiAddress,
    structType: string,
    paginationArguments: PaginationArguments<PaginatedObjectsResponse['nextCursor']>
  ): Promise<PaginatedObjectIds> {
    if (!isValidSuiAddress(owner)) throw new Error(`${owner} is not a valid address`)
    const objectIds: ObjectId[] = []
    const ownedObjects = await this._rpcProvider.getOwnedObjects({
      owner,
      filter: {
        StructType: structType,
      },
      ...paginationArguments,
    })
    for (const ownedObject of ownedObjects.data) {
      if (ownedObject.data) {
        objectIds.push(ownedObject.data.objectId)
      }
    }
    return {
      objectIds,
      nextCursor: ownedObjects.nextCursor,
      hasNextPage: ownedObjects.hasNextPage
    }
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
        paused: streamRecord.fields.pause_info.fields.paused,
        pausedAt: parseInt(streamRecord.fields.pause_info.fields.pause_at),
        accPausedTime: parseInt(streamRecord.fields.pause_info.fields.acc_paused_time),
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
    if (!isValidSuiObjectId(normalizeSuiObjectId(parts[0]))) {
      throw new Error(`${coinType} is not in a valid format`)
    }
  }

  private normalizeCoinType(coinType: string): string {
    const parts = coinType.split('::')
    return `${normalizeSuiObjectId(parts[0])}::${parts[1]}::${parts[2]}`
  }

  private isSUI(coinType: string): boolean {
    return this.normalizeCoinType(coinType) === this.SUI
  }

  private async getCoins(owner: SuiAddress, coinType: string, amount: bigint): Promise<ObjectId[]> {
    const coinObjectIds: ObjectId[] = []
    let total = BigInt(0)
    let hasNextPage = true
    let nextCursor = null
    while (hasNextPage && total < amount) {
      const paginatedCoins = await this._rpcProvider.getCoins({ owner, coinType, cursor: nextCursor })
      hasNextPage = paginatedCoins.hasNextPage
      nextCursor = paginatedCoins.nextCursor
      for (const coin of paginatedCoins.data) {
        if (!coin.lockedUntilEpoch) {
          total += BigInt(coin.balance)
          coinObjectIds.push(coin.coinObjectId)
          if (total >= amount) break
        }
      }
    }
    return coinObjectIds
  }

  private async getCoin(
    txb: TransactionBlock,
    owner: SuiAddress,
    coinType: string,
    amount: bigint
  ): Promise<TransactionArgument> {
    let coin: TransactionArgument
    if (this.isSUI(coinType)) {
      coin = txb.splitCoins(txb.gas, [txb.pure(amount)])[0]
    } else {
      const coinObjectIds = await this.getCoins(owner, coinType, amount)
      if (coinObjectIds.length == 0)
        throw new Error(`no coin is available in the account ${owner}`)
      if (coinObjectIds.length == 1) {
        coin = txb.object(coinObjectIds[0])
      } else {
        coin = txb.mergeCoins(txb.object(coinObjectIds[0]), coinObjectIds.slice(1).map(id => txb.object(id)))
      }
    }
    return coin
  }

  // use this function if there aren't many (over 100) coins supported
  async getSupportedCoins(): Promise<CoinConfig[]> {
    const coinConfigs: CoinConfig[] = []
    let hasNextPage = true
    let nextCursor = null
    while (hasNextPage) {
      const paginatedCoinConfigs = await this.getPaginatedSupportedCoins({
        cursor: nextCursor
      })
      coinConfigs.push(...paginatedCoinConfigs.coinConfigs)
      hasNextPage = paginatedCoinConfigs.hasNextPage
      nextCursor = paginatedCoinConfigs.nextCursor
    }
    return coinConfigs
  }

  // use this function if there are many (over 100) coins supported
  async getPaginatedSupportedCoins(
    paginationArguments: PaginationArguments<string | null>
  ): Promise<PaginatedCoinConfigs> {
    const coinConfigs: CoinConfig[] = []
    const coinConfigsObject = await this._rpcProvider.getDynamicFields({
      parentId: this._config.coinConfigsObjectId,
      ...paginationArguments
    })
    const objectIds: ObjectId[] = []
    for (let data of coinConfigsObject.data) {
      objectIds.push(data.objectId)
    }
    const coinConfigObjects = await this._rpcProvider.multiGetObjects({
      ids: objectIds,
      options: { showContent: true }
    })
    for (let coinConfigObject of coinConfigObjects) {
      const content = coinConfigObject.data?.content as DynamicFields
      coinConfigs.push({
        coinType: content.fields.value.fields.coin_type,
        feePoint: content.fields.value.fields.fee_point,
      })
    }
    return {
      coinConfigs,
      nextCursor: coinConfigsObject.nextCursor,
      hasNextPage: coinConfigsObject.hasNextPage
    }
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
    if (!isValidSuiAddress(newFeeRecipient)) throw new Error(`${newFeeRecipient} is not a valid address`)
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
