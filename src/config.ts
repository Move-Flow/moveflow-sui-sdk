export enum Network {
    devnet,
    testnet,
    mainnet,
}

export type Config = {
    network: Network
    fullNodeUrl: string
    packageObjectId: string
    globalConfigObjectId: string
}

export const TESTNET_CONFIG: Config = {
    network: Network.testnet,
    fullNodeUrl: 'https://fullnode.testnet.sui.io/',
    packageObjectId: '0xd4a8b17cbc665b5a92311e14cdb24de7abbfae9d9616babdd5f9f732a2987311',
    globalConfigObjectId: '0xa1a1eec8f02b609612c7c6ac6dac44f86db9c3b6e65b020c809270fbb0895ab4',
}

export function getConfig(network: Network) : Config {
    switch(network) {
        case Network.testnet:
            return TESTNET_CONFIG
        default:
            throw new Error(`Sorry, ${Network[network]} not supported yet`)
    }
}
