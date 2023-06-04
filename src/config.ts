import { ObjectId } from '@mysten/sui.js'

export enum Network {
  devnet,
  testnet,
  mainnet,
  unittest
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
  packageObjectId: '0x8adcbe225d672f56ee96abc51481887e106661ef899ccc5a7dec7161b790be69',
  globalConfigObjectId: '0x95b3e1f1fefef450e4fdbf6d5279ca2421429a5bd2ce7da50cf32b62c5f326b2',
  coinConfigsObjectId: '0x64d9d712a435f282cbd5756b7b3d215a5ef81f385ac3339a6b3d23119e4c3a52',
  incomingStreamObjectId: '0x2fb090feef48968b937ff470273dcab417d4ad870d7e336fcd7b656fdeeb936a',
  outgoingStreamObjectId: '0x204f815be7a8eaf535e4899556a14d07dd2e29a35148ac249577858ba9583b8a',
  manageCap: '0x1f683a52f9e83f868349e9f6a6ed4de9913b6eb88318b5ce7d0b52e9fddc6295',
}

export const UNITTEST_CONFIG: Config = {
  network: Network.testnet,
  fullNodeUrl: 'https://fullnode.testnet.sui.io/',
  packageObjectId: '0xe1ea123817e732196058b0ce13a6a56d12c84bb0ce2bce5c671a4d892a6fe5ae',
  globalConfigObjectId: '0xcfcf57e9576e3c4392ee9368d7d7030d7457c6fcfe280b478092239f66fb0222',
  coinConfigsObjectId: '0x171616762eb4c7a6846ecd7f0834fae0fe4a66880800e918ab854fe499105c59',
  incomingStreamObjectId: '0x06db9b81b60b335001e826aacd1a0084c5ba676a219ce53c59ed25539a8454b6',
  outgoingStreamObjectId: '0x85d0261d6757b2e98cf12d66062fc3d506d91aacccdda622593c1468f4939af0',
  manageCap: '0x54ea464f37e14ee61169c3e6c881eabe86ec05f1e0cef45b00ac387ff0bd4885',
}

export function getConfig(network: Network): Config {
  switch (network) {
    case Network.testnet:
      return TESTNET_CONFIG
    case Network.unittest:
      return UNITTEST_CONFIG
    default:
      throw new Error(`Sorry, ${Network[network]} not supported yet`)
  }
}
