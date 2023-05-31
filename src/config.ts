import { ObjectId } from '@mysten/sui.js'

export enum Network {
  devnet,
  testnet,
  mainnet,
}

export type Config = {
  network: Network
  fullNodeUrl: string
  packageObjectId: ObjectId
  globalConfigObjectId: ObjectId
  coinConfigsObjectId: ObjectId
  incomingStreamObjectId: ObjectId
  outgoingStreamObjectId: ObjectId
  manageCap: ObjectId
}

export const TESTNET_CONFIG: Config = {
  network: Network.testnet,
  fullNodeUrl: 'https://fullnode.testnet.sui.io/',
  packageObjectId: '0xd4a8b17cbc665b5a92311e14cdb24de7abbfae9d9616babdd5f9f732a2987311',
  globalConfigObjectId: '0xa1a1eec8f02b609612c7c6ac6dac44f86db9c3b6e65b020c809270fbb0895ab4',
  coinConfigsObjectId: '0x7fc9b9e34eb6bad2bab11334c84bc1fcd2623d680d92849fcc07c08a2a2f9feb',
  incomingStreamObjectId: '0x55fe3b02615c2dd3baf4f5f1f54337f20e65f1f16a36700078bb4fec43d7899e',
  outgoingStreamObjectId: '0x9302b20ecc6d84820b795172219aba934186a9364d353e6e445819f5c5618b34',
  manageCap: '0xadc0149b9a66f58d75cedc8a5e3a3c11f17f7106c741093652153a31118bf8d2',
}

export function getConfig(network: Network): Config {
  switch (network) {
    case Network.testnet:
      return TESTNET_CONFIG
    default:
      throw new Error(`Sorry, ${Network[network]} not supported yet`)
  }
}
