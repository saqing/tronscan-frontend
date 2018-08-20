import React from "react";
import xhr from "axios/index";
import {Client} from "../../../services/api";
import {ONE_TRX} from "../../../constants";
import {connect} from "react-redux";
import {injectIntl} from "react-intl";
import {filter, includes} from "lodash";
import {tronAddresses} from "../../../utils/tron";
import {TronLoader} from "../../common/loaders";
import PieReact from "../../common/PieChart";
import LineReact from "../../common/LineChart";
import {cloneDeep} from "lodash";
import {tu} from "../../../utils/i18n";
import CountUp from 'react-countup';
import {Link} from "react-router-dom"

import {
    LineReactAdd,
    LineReactBlockSize,
    LineReactBlockchainSize,
    LineReactTx,
    LineReactPrice,
    LineReactVolumeUsd
} from "../../common/LineCharts";

import {
    RepresentativesRingPieReact,
    SupplyTypesTRXPieChart
} from "../../common/RingPieChart";

import {loadPriceData} from "../../../actions/markets";
import {t} from "../../../utils/i18n";

class Statistics extends React.Component {

    constructor() {
        super();

        this.state = {
            accounts: null,
            transactionStats: null,
            blockStats: null,
            transactionValueStats: null,
            txOverviewStats: null,
            addressesStats: null,
            blockSizeStats: null,
            blockchainSizeStats: null,
            priceStats: null,
            volumeStats: null,
            summit: null,
            pieChart: null,
            supplyTypesChart: null,
            genesisNum:'',
            blockProduceRewardsNum:'',
            nodeRewardsNum:'',
            independenceDayBurned:'',
            feeBurnedNum:'',
            currentTotalSupply:'',
            priceUSD:'',
            priceBTC:'',
            marketCapitalization:'',
            foundationFreeze:''
        };
    }

    componentDidMount() {
        this.loadAccounts();
        this.loadStats();
        this.loadTxOverviewStats();
    }

    async loadAccounts() {

        let {accounts} = await Client.getAccounts({
            limit: 35,
            sort: '-balance',
        });

        this.setState({
            accounts: filter(accounts, account => !includes(tronAddresses, account.address))
                .slice(0, 10)
                .map(account => ({
                    name: account.address,
                    value: account.balance / ONE_TRX,
                }))
        });
    }


    async loadStats() {

        let {stats} = await Client.getTransferStats({
            groupby: 'timestamp',
            interval: 'hour',
        });

        let {stats: blockStats} = await Client.getBlockStats({
            info: `avg-block-size`,
        });

        let transactionTotalStats = stats.total.map(row => ({
            timestamp: row.timestamp,
            value: row.value,
        }));

        let valueStats = stats.value.map(row => ({
            timestamp: row.timestamp,
            value: row.value / ONE_TRX,
        }));

        blockStats = blockStats.map(row => ({
            timestamp: row.timestamp,
            value: row.value,
        }));

        this.setState({
            transactionStats: transactionTotalStats,
            transactionValueStats: valueStats,
            blockStats,
        });
    }

    async loadTxOverviewStats() {
        let {intl} = this.props;
        let today = new Date();
        let timerToday = today.getTime();

        let birthday = new Date("2017/10/10");
        let timerBirthday = birthday.getTime();
        let dayNum = Math.floor((timerToday - timerBirthday) / 1000 / 3600 / 24);


        let {data} = await xhr.get("https://min-api.cryptocompare.com/data/histoday?fsym=TRX&tsym=USD&limit=" + dayNum);
        let priceStatsTemp = data['Data'];


        let volumeData = await xhr.get("https://cors.io/?https://graphs2.coinmarketcap.com/currencies/tron/",);
        let volumeUSD = volumeData.data.volume_usd

        let volume = volumeUSD.map(function (v, i) {
            return {
                time: v[0],
                volume_billion: v[1] / Math.pow(10, 9),
                volume_usd: intl.formatNumber(v[1]) + ' USD',
                volume_usd_num: v[1]
            }
        })

        let {statisticData} = await Client.getStatisticData()
        let pieChartData = [];
        if (statisticData.length > 0) {
            statisticData.map((val, i) => {
                pieChartData.push({
                    key: i + 1,
                    name: val.name ? val.name : val.url,
                    volumeValue: intl.formatNumber(val.blockProduced),
                    volumePercentage: intl.formatNumber(val.percentage * 100, {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2
                    }) + '%',
                });

            })
        }

        let random = Math.random();
        let balanceData = await xhr.get("https://tron.network/api/v2/node/balance_info?random=" + random);
        let TRONFoundationTotal = balanceData.data.total;
        let {blocks} = await Client.getBlocks({
            limit: 1,
            sort: '-number',
        });
        let blockHeight = blocks[0] ? blocks[0].number : 0;
        let nodeRewardsNum = blockHeight * 16;
        let blockProduceRewardsNum = blockHeight * 32;
        let address = await Client.getAddress('TLsV52sRDL79HXGGm9yzwKibb6BeruhUzy');
        let startFeeBurnedNum = Math.abs(-9223372036854.775808)
        let feeBurnedNum = (startFeeBurnedNum - Math.abs(address.balance / ONE_TRX)).toFixed(2);
        let genesisNum = 100000000000;
        let independenceDayBurned = 1000000000;
        let currentTotalSupply = genesisNum + blockProduceRewardsNum + nodeRewardsNum - independenceDayBurned - feeBurnedNum;
        let genesisCirculatingNum = (currentTotalSupply - blockProduceRewardsNum - nodeRewardsNum - TRONFoundationTotal).toFixed(2);
        let supplyTypesChartData = [
            {value: nodeRewardsNum, name: 'node_rewards', selected: true},
            {value: blockProduceRewardsNum, name: 'block_produce_rewards', selected: true},
            {value: TRONFoundationTotal, name: 'tron_foundation', selected: true},
            {value: genesisCirculatingNum, name: 'genesis_circulating_supply', selected: true},
        ]
        let trxPriceData = await xhr.get(`https://api.coinmarketcap.com/v1/ticker/tronix/?convert=EUR`);
        let priceUSD = ((parseFloat(trxPriceData.data[0].price_usd))*1000).toFixed(2);
        let priceBTC = ((parseFloat(trxPriceData.data[0].price_btc))*1000).toFixed(5);
        let marketCapitalization = ((parseFloat(trxPriceData.data[0].price_usd)*currentTotalSupply)).toFixed(2);
        let {txOverviewStats} = await Client.getTxOverviewStats();
        let temp = [];
        let addressesTemp = [];
        let blockSizeStatsTemp = [];
        let blockchainSizeStatsTemp = [];
        for (let txs in txOverviewStats) {
            let tx = parseInt(txs);
            if (tx === 0) {
                temp.push(txOverviewStats[tx]);
                addressesTemp.push({
                    date: txOverviewStats[tx].date,
                    total: txOverviewStats[tx].newAddressSeen,
                    increment: txOverviewStats[tx].newAddressSeen
                });
            }
            else {
                temp.push({
                    date: txOverviewStats[tx].date,
                    totalTransaction: (txOverviewStats[tx].totalTransaction - txOverviewStats[tx - 1].totalTransaction),
                    avgBlockTime: txOverviewStats[tx].avgBlockTime,
                    avgBlockSize: txOverviewStats[tx].avgBlockSize,
                    totalBlockCount: (txOverviewStats[tx].totalBlockCount - txOverviewStats[tx - 1].totalBlockCount),
                    newAddressSeen: txOverviewStats[tx].newAddressSeen
                });
                addressesTemp.push({
                    date: txOverviewStats[tx].date,
                    total: txOverviewStats[tx].newAddressSeen + addressesTemp[tx - 1].total,
                    increment: txOverviewStats[tx].newAddressSeen
                });
            }
            blockSizeStatsTemp.push({
                date: txOverviewStats[tx].date,
                avgBlockSize: txOverviewStats[tx].avgBlockSize
            });
            blockchainSizeStatsTemp.push({
                date: txOverviewStats[tx].date,
                blockchainSize: txOverviewStats[tx].blockchainSize
            });
        }

        this.setState({
            txOverviewStats: temp,
            addressesStats: addressesTemp,
            blockSizeStats: blockSizeStatsTemp,
            blockchainSizeStats: blockchainSizeStatsTemp,
            priceStats: priceStatsTemp,
            volumeStats: volume,
            pieChart: pieChartData,
            supplyTypesChart: supplyTypesChartData,
            genesisNum:intl.formatNumber(genesisNum),
            blockProduceRewardsNum:intl.formatNumber(blockProduceRewardsNum),
            nodeRewardsNum:intl.formatNumber(nodeRewardsNum),
            independenceDayBurned:intl.formatNumber(independenceDayBurned),
            feeBurnedNum:intl.formatNumber(feeBurnedNum),
            currentTotalSupply:currentTotalSupply,
            priceUSD:priceUSD,
            priceBTC:priceBTC,
            marketCapitalization:marketCapitalization,
            foundationFreeze:intl.formatNumber(TRONFoundationTotal)
        });

        function compare(property) {
            return function (obj1, obj2) {

                if (obj1[property] > obj2[property]) {
                    return 1;
                } else if (obj1[property] < obj2[property]) {
                    return -1;
                } else {
                    return 0;
                }

            }
        }

        let higest = {date: '', increment: ''};
        let lowest = {date: '', increment: ''};
        let addr = cloneDeep(addressesTemp).sort(compare('increment'));
        let tx = cloneDeep(temp).sort(compare('totalTransaction'));
        let bs = cloneDeep(blockSizeStatsTemp).sort(compare('avgBlockSize'));
        let pr = cloneDeep(priceStatsTemp).sort(compare('close'));
        let vo = cloneDeep(volume).sort(compare('volume_usd_num'));
        for (let p in pr) {
            pr[p] = {date: pr[p].time, ...pr[p]};
        }
        for (let v in vo) {
            vo[v] = {date: vo[v].time, ...vo[v]};
        }
        let _bcs = [];

        for (let b in blockchainSizeStatsTemp) {
            let _b = parseInt(b);
            if (_b === 0) {
                _bcs.push({
                    date: blockchainSizeStatsTemp[0].date,
                    blockchainSize: blockchainSizeStatsTemp[0].blockchainSize / 1000000
                });
            }
            else {
                _bcs.push({
                    date: blockchainSizeStatsTemp[_b].date,
                    blockchainSize: (blockchainSizeStatsTemp[_b].blockchainSize - blockchainSizeStatsTemp[_b - 1].blockchainSize) / 1000000
                })
            }
        }
        let bcs = _bcs.sort(compare('blockchainSize'));

        this.setState({
            summit: {
                addressesStats_sort: [
                    {
                        date: addr[addr.length - 1].date,
                        increment: addr[addr.length - 1].increment
                    },
                    {
                        date: addr[0].date,
                        increment: addr[0].increment
                    }],
                txOverviewStats_sort: [
                    {
                        date: tx[tx.length - 1].date,
                        increment: tx[tx.length - 1].totalTransaction
                    },
                    {
                        date: tx[0].date,
                        increment: tx[0].totalTransaction
                    }],
                blockSizeStats_sort: [
                    {
                        date: bs[bs.length - 1].date,
                        increment: bs[bs.length - 1].avgBlockSize
                    },
                    {
                        date: bs[0].date,
                        increment: bs[0].avgBlockSize
                    }],
                blockchainSizeStats_sort: [
                    {
                        date: bcs[bcs.length - 1].date,
                        increment: bcs[bcs.length - 1].blockchainSize
                    },
                    {
                        date: bcs[0].date,
                        increment: bcs[0].blockchainSize
                    }],
                priceStats_sort: [
                    {
                        date: pr[pr.length - 1].date * 1000,
                        increment: pr[pr.length - 1].close
                    },
                    {
                        date: pr[0].date * 1000,
                        increment: pr[0].close
                    }],
                volumeStats_sort: [
                    {
                        date: vo[vo.length - 1].date,
                        increment: vo[vo.length - 1].volume_usd_num
                    },
                    {
                        date: vo[0].date,
                        increment: vo[0].volume_usd_num
                    }]
            }
        });
    }


    render() {
        let {match, intl} = this.props;
let {txOverviewStats, addressesStats, blockSizeStats, blockchainSizeStats, priceStats, transactionStats, transactionValueStats, blockStats, accounts, volumeStats, pieChart, supplyTypesChart, summit,genesisNum,blockProduceRewardsNum,nodeRewardsNum,independenceDayBurned,feeBurnedNum,currentTotalSupply,priceUSD,priceBTC,marketCapitalization,foundationFreeze} = this.state;

        let unit;
        if (match.params.chartName === 'blockchainSizeStats' ||
            match.params.chartName === 'addressesStats') {
            unit = 'increase';
        } else {
            unit = 'number';
        }
        return (
            <main className="container header-overlap">
                {
                    match.params.chartName != 'pieChart' && match.params.chartName != 'supply' ?
                        <div className="alert alert-light" role="alert">
                            <div className="row">
                                <div className="col-md-6 text-center">
                                    {
                                        summit && summit[match.params.chartName + '_sort'] &&
                                        <span>{t('highest')}{t(unit)}{t('_of')}
                                            <strong>{' ' + summit[match.params.chartName + '_sort'][0].increment + ' '}</strong>
                                            {t('was_recorded_on')} {intl.formatDate(summit[match.params.chartName + '_sort'][0].date)}
                            </span>
                                    }
                                </div>
                                <div className="col-md-6 text-center">
                                    {
                                        summit && summit[match.params.chartName + '_sort'] &&
                                        <span>{t('lowest')}{t(unit)}{t('_of')}
                                            <strong>{' ' + summit[match.params.chartName + '_sort'][1].increment + ' '}</strong>
                                            {t('was_recorded_on')} {intl.formatDate(summit[match.params.chartName + '_sort'][1].date)}
                            </span>
                                    }
                                </div>
                            </div>
                        </div>
                        : null
                }
                <div className="row">
                    <div className="col-md-12">
                        <div className="card">
                            <div className="card-body">
                                {
                                    match.params.chartName === 'txOverviewStats' &&
                                    <div style={{height: 500}}>
                                        {
                                            txOverviewStats === null ?
                                                <TronLoader/> :
                                                <LineReactTx source='singleChart' style={{height: 500}}
                                                             data={txOverviewStats} intl={intl}/>
                                        }
                                    </div>
                                }
                                {
                                    match.params.chartName === 'addressesStats' &&
                                    <div style={{height: 500}}>
                                        {
                                            addressesStats === null ?
                                                <TronLoader/> :
                                                <LineReactAdd source='singleChart' style={{height: 500}}
                                                              data={addressesStats} intl={intl}/>
                                        }
                                    </div>
                                }
                                {
                                    match.params.chartName === 'blockSizeStats' &&
                                    <div style={{height: 500}}>
                                        {
                                            blockSizeStats === null ?
                                                <TronLoader/> :
                                                <LineReactBlockSize source='singleChart' style={{height: 500}}
                                                                    data={blockSizeStats}
                                                                    intl={intl}/>
                                        }
                                    </div>
                                }
                                {
                                    match.params.chartName === 'blockchainSizeStats' &&
                                    <div style={{height: 500}}>
                                        {
                                            blockchainSizeStats === null ?
                                                <TronLoader/> :
                                                <LineReactBlockchainSize source='singleChart' style={{height: 500}}
                                                                         data={blockchainSizeStats} intl={intl}/>
                                        }
                                    </div>
                                }
                                {
                                    match.params.chartName === 'priceStats' &&
                                    <div style={{height: 500}}>
                                        {
                                            priceStats === null ?
                                                <TronLoader/> :
                                                <LineReactPrice source='singleChart' style={{height: 500}}
                                                                data={priceStats} intl={intl}/>
                                        }
                                    </div>
                                }
                                {
                                    match.params.chartName === 'accounts' &&
                                    <div style={{height: 500}}>
                                        {
                                            accounts === null ?
                                                <TronLoader/> :
                                                <PieReact style={{height: 500}} data={accounts}/>
                                        }
                                    </div>
                                }
                                {
                                    match.params.chartName === 'transactionValueStats' &&
                                    <div style={{height: 500}}>
                                        {
                                            transactionValueStats === null ?
                                                <TronLoader/> :
                                                <LineReact message={{
                                                    id: 'trx_transferred_past_hour',
                                                    href: 'transactionValueStats'
                                                }}
                                                           style={{height: 500}} data={transactionValueStats}
                                                           keysData={['timestamp', 'value']}
                                                           format={{timestamp: true}}/>
                                        }
                                    </div>
                                }
                                {
                                    match.params.chartName === 'transactionStats' &&
                                    <div style={{height: 500}}>
                                        {
                                            transactionStats === null ?
                                                <TronLoader/> :
                                                <LineReact
                                                    message={{id: 'transactions_past_hour', href: 'transactionStats'}}
                                                    style={{height: 500}} data={transactionStats}
                                                    keysData={['timestamp', 'value']}
                                                    format={{timestamp: true}}/>
                                        }
                                    </div>
                                }
                                {
                                    match.params.chartName === 'blockStats' &&
                                    <div style={{height: 500}}>
                                        {
                                            blockStats === null ?
                                                <TronLoader/> :
                                                <LineReact message={{id: 'average_blocksize', href: 'blockStats'}}
                                                           style={{height: 500}} data={blockStats}
                                                           keysData={['timestamp', 'value']}
                                                           format={{timestamp: true}}/>
                                        }
                                    </div>
                                }
                                {
                                    match.params.chartName === 'volumeStats' &&
                                    <div style={{height: 500}}>
                                        {
                                            volumeStats === null ?
                                                <TronLoader/> :
                                                <LineReactVolumeUsd source='singleChart' style={{height: 500}}
                                                                    data={volumeStats} intl={intl}/>
                                        }
                                    </div>
                                }
                                {

                                    match.params.chartName === 'pieChart' &&
                                    <div>
                                        {
                                            pieChart === null ?
                                                <TronLoader/> :
                                                <RepresentativesRingPieReact source='singleChart'
                                                                             message={{id: 'produce_distribution'}}
                                                                             intl={intl} data={pieChart}
                                                                             style={{height: 500}}/>

                                        }
                                    </div>

                                }
                                {
                                    match.params.chartName === 'supply' &&
                                    <div>
                                        {
                                            supplyTypesChart === null ?
                                                <TronLoader/> :
                                                <div className="row" style={{fontSize : 12,marginRight:0}}>
                                                    <div className="col-md-5">
                                                        <div className="table-responsive">
                                                            <table className="table" style={{marginTop : 10}}>
                                                            <thead>
                                                            <tr>
                                                                <th style={{border:0}}>
                                                                    <i className="fa fa-puzzle-piece" ></i>
                                                                    <span style={{marginTop:2}}>{tu('TRX_distribution_overview')}</span>
                                                                </th>
                                                            </tr>
                                                            </thead>
                                                            <tbody>
                                                            <tr>
                                                                <td>
                                                                    {tu('genesis')}:
                                                                </td>
                                                                <td>
                                                                    {genesisNum} TRX
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td>+  {tu('block_produce_rewards')}:
                                                                </td>
                                                                <td>
                                                                    {blockProduceRewardsNum} TRX
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td>+ {tu('node_rewards')}:
                                                                </td>
                                                                <td>
                                                                    {nodeRewardsNum} TRX
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td>- {tu('independence_day_burned')}:
                                                                </td>
                                                                <td>
                                                                    {independenceDayBurned} TRX
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td>- {tu('fee_burned')}:
                                                                </td>
                                                                <td>
                                                                    {feeBurnedNum} TRX
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td>= <b>{tu('current_total_supply')}:</b><br/>
                                                                </td>
                                                                <td>
                                                                    <b>{intl.formatNumber(currentTotalSupply)} TRX</b>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td style={{color:'red'}} className="go-foundation">
                                                                    <Link to="/blockchain/foundation" style={{color:'red',}}>{tu("foundation_freeze")}</Link>
                                                                </td>
                                                                <td>
                                                                    {foundationFreeze} TRX
                                                                </td>
                                                            </tr>
                                                            </tbody>
                                                        </table>
                                                        </div>
                                                        <br/>
                                                        <div className="table-responsive">
                                                            <table className="table">
                                                                <thead>
                                                                <tr>
                                                                    <th style={{border:0}}><br/><i className="fa fa-coins" ></i> {tu('price_per_1000_trx')}</th>
                                                                </tr>
                                                                </thead>
                                                                <tbody><tr>
                                                                    <td>{tu('in_USD')}:
                                                                    </td>
                                                                    <td>
                                                                        ${priceUSD}
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td>{tu('in_BTC')}:
                                                                    </td>
                                                                    <td>
                                                                        {priceBTC}
                                                                    </td>
                                                                </tr>
                                                                </tbody></table>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-7" style={{backgroundColor: '#F5F5F5',marginTop:0,paddingBottom:15}}>
                                                        <div className="main-counters row">
                                                            <div className="counters col-md-6 col-sm-6">
                                                                <span className="counter">
                                                                    <CountUp start={0} end={currentTotalSupply} duration={2}  separator="," decimals={2} />
                                                                </span>
                                                                <h4>{tu('total_TRX_supply')}</h4>
                                                            </div>
                                                            <div className="counters col-md-6 col-sm-6">
                                                                <span className="counter">
                                                                    $<CountUp start={0} end={marketCapitalization} duration={2}  separator="," decimals={2}/>
                                                                </span>
                                                                <h4>{tu('market_capitalization')}</h4>
                                                            </div>
                                                        </div>
                                                        <div className="card">
                                                            <div className="card-body">
                                                                <SupplyTypesTRXPieChart
                                                                    message={{id: 'breakdown_supply_types'}}
                                                                    intl={intl}
                                                                    data={supplyTypesChart}
                                                                    style={{height: 340}}
                                                                    source='singleChart'
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            }
                                    </div>

                                }
                            </div>
                        </div>
                    </div>
                </div>

            </main>
        );
    }
}


function

mapStateToProps(state) {
    return {
        priceGraph: state.markets.price
    };
}

const
    mapDispatchToProps = {
        loadPriceData,
    };

export default connect(mapStateToProps, mapDispatchToProps)

(
    injectIntl(Statistics)
)
