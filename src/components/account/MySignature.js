import {connect} from "react-redux";
import { Link } from 'react-router-dom';
import React, { Fragment } from "react";
import {tu, t,option_t} from "../../utils/i18n";
import {alpha} from "../../utils/str";
import {Client} from "../../services/api";
import {upperFirst} from "lodash";
import { Tag,Radio } from 'antd';
import {TokenLink, TokenTRC20Link, HrefLink, AddressLink} from "../common/Links";
import {QuestionMark} from "../common/QuestionMark";
import xhr from "axios/index";
import {FormattedDate, FormattedNumber, FormattedRelative, FormattedTime, injectIntl} from "react-intl";
import { API_URL, CONTRACT_MAINNET_API_URL, TOKENTYPE, MARKET_API_URL, VERIFYSTATUS, MARKET_HTTP_URL } from "../../constants";
import { getTime } from "date-fns";
import {CopyToClipboard} from "react-copy-to-clipboard";
import {Tooltip} from "reactstrap";
import { Popover, Button, Tooltip as AntdTip } from 'antd';
import { IS_SUNNET, IS_MAINNET } from './../../constants';
import SweetAlert from 'react-bootstrap-sweetalert';
import SmartTable from "../common/SmartTable.js"
import TotalInfo from "../common/TableTotal";
import Countdown from "react-countdown-now";
import _, {find} from "lodash";
import SignDetailsModal from './SignDetailsModal';
import { TransactionHashLink } from "../common/Links";


class MySignature extends React.Component{
    constructor() {
        super();
        this.state = {
            modal: null,
            total: 0,
            data: [],
            //0-签名中，1-签名交易完成， 2-交易过期/处理失败 10-待签名  11-已签名 255-全部
            filter: {
                direction: 255,
                multiState: 255,
            },
            isShowSignDetailsModal: false,
            details: {}
        };
    }

    componentDidMount() {
        this.load()
    }


    load = async (page = 1, pageSize = 20) => {
        let { wallet } = this.props;
        console.log('wallet',wallet)
        console.log('wallet222',wallet.address)
        let { filter, multiState} = this.state;
        let { data:{data} } = await xhr.get("https://testlist.tronlink.org/api/wallet/multi/trx_record", {params: {
            "address": wallet.address,
            "start": (page - 1) * pageSize,
            "state": filter.direction,
            "limit": 1000,
            "netType":"shasta"
        }});
        let signatureList = data.data;
        let total = data.total;
        console.log('signatureList',signatureList)
        console.log('total',total)
        signatureList.map((item)=>{
            if(item.state == 0){
                item.signatureProgress.map((sign,index)=>{
                    if(sign.address == wallet.address){
                        //0-未签名 1-已签名
                        if(sign.isSign == 0){
                            item.multiState = 10;
                        }else {
                            item.multiState = 11;
                        }
                    }
                })
            }else{
                item.multiState = item.state;
            }
        })
        let list;
        console.log('signatureList',signatureList)
        if(filter.multiState !== 255){
            list = _(signatureList)
                .filter(signTx => signTx.multiState == filter.multiState)
                .value();
        }else{
            list = signatureList
        }
        console.log('list',list)
        this.setState({
            page,
            data:list,
            total:total,
            loading: false,
        });
    };

    /**
     * Change Type
     */
    onRadioChange = (type,str) => {
        console.log('type',type)
        console.log('str',str)
        let multiState;
        if(type == 0 && str == "to_be_sign"){
            multiState = 10
        }else if(type == 0 && str == "signed"){
            multiState = 11
        }else{
            multiState = type
        }
        this.setState({
            filter: {
                direction: type,
                multiState
            }
        }, () =>  this.load())
    };

    multiSign = async(details) => {
        let {wallet} = this.props;
        let transactionId;
        let result, success,tronWeb;
        console.log('e=====',details)
        //create transaction
        tronWeb = this.props.account.tronWeb;
        const currentTransaction = details.currentTransaction;

        //set transaction txID
        currentTransaction.txID = details.hash;
        //sign transaction
        const SignTransaction = await tronWeb.trx.multiSign(currentTransaction, tronWeb.defaultPrivateKey,currentTransaction.raw_data.contract[0].Permission_id).catch(e => {
            console.log('e',e)
        });
        console.log('SignTransaction111',SignTransaction)

        // xhr.defaults.headers.common["MainChain"] = 'MainChain';

        //xhr multi-sign transaction api
        let { data } = await xhr.post("https://testlist.tronlink.org/api/wallet/multi/transaction", {
            "address": wallet.address,
            "transaction": SignTransaction,
            "netType":"shasta"
        });
        result = data.code;
        console.log('code',result)
        if (result == 0) {
            transactionId = true;
        } else {
            transactionId = false;
        }
        if (transactionId) {
            this.onSignedTransaction('transaction_signature_muti');
        } else {
            this.onSignedTransaction('transaction_create_failed');
        }

    }

    /**
     * close SignedTransaction
     */
    hideModal = () => {
        this.setState({ modal: null });
    }

    /**
     * open SignedTransaction
     */
    onSignedTransaction = (str) => {
        this.setState({
            modal: (
                <SweetAlert success title={tu(str)} onConfirm={this.hideModal}/>
            )
        });
    };



    /**
     * close SignDetailsModal
     */
    closeSignDetailsModal = () => {
        this.setState({ isShowSignDetailsModal: false });
    }

    /**
     * open SignDetailsModal
     * @param details
     */
    openSignDetailsModal = details => {
      //  const { address, currency, balance, precision, id, type } = option;
        this.setState({
            isShowSignDetailsModal: true,
            details,
        });
    }

    customizedColumn = () => {
        let {intl, isinternal = false} = this.props;
        let column = [
            {
                title: upperFirst(intl.formatMessage({id: 'signature_type'})),
                dataIndex: 'contractType',
                key: 'contractType',
                align: 'left',
                className: 'ant_table',
                render: (text, record, index) => {
                    return <span>{text}</span>
                }
            },
            {
                title: upperFirst(intl.formatMessage({id: 'signature_sponsor'})),
                dataIndex: 'originatorAddress',
                key: 'originatorAddress',
                align: 'left',
                className: 'ant_table',
                width: '15%',
                render: (text, record, index) => {
                    return <AddressLink address={text}>{text}</AddressLink>
                }
            },
            {
                title: upperFirst(intl.formatMessage({id: 'signature_time_left'})),
            dataIndex: 'expireTime',
                key: 'expireTime',
                align: 'center',
                className: 'ant_table',
                render: (text, record, index) => {
                    return text?<Countdown date={Date.now() + (record.expireTime*1000)} daysInHours={true}/>:'-'
                }
            },
            {
                title: upperFirst(intl.formatMessage({id: 'signature_list'})),
                dataIndex: 'confirmed',
                key: 'confirmed',
                align: 'left',
               // width: '25%',
                className: 'ant_table',
                render: (text, record, index) => {
                    return (
                        <div className="p-2 position-relative" style={{'background':'#f3f3f3'}}>
                        <div className="text-left signature-currentWeight">{record.currentWeight + '/' +record.threshold}</div>
                        {
                            record.signatureProgress.map((item,index)=>{
                            return    <div key={index} className="d-flex mt-1">
                                        <div style={{width:250}}>
                                            <AddressLink address={item.address}>{item.address}</AddressLink>
                                        </div>
                                        <div className="ml-2 p-1 d-block signature-weight">{item.weight}</div>
                                        {item.isSign == 1 ? <i className="ml-2 signature-siged"></i>:''}

                                </div>
                            })
                        }
                    </div>
                    )
                },
            },
            {
                title: upperFirst(intl.formatMessage({id: 'signature_status'})),
                dataIndex: 'multiState',
                key: 'multiState',
                align: 'center',
                className: 'ant_table',
                width: '15%',
                render: (text, record, index) => {
                    return <span>
                        <span>
                            {text == 10 && tu('to_be_sign')}
                            {text == 11 && tu('signed')}
                        </span>
                        <span style={{color:'#c23631'}}>
                            {text == 2 && tu('signature_failed')}
                        </span>
                        <span style={{color:'#69C265'}}>
                             {text == 1 && tu('signature_successful')}
                        </span>
                    </span>
                },
            },
            {
                title: upperFirst(intl.formatMessage({id: 'signature_operate'})),
                dataIndex: 'signature_operate',
                key: 'signature_operate',
                align: 'right',
                className: 'ant_table',
                width: '15%',
                render: (text, record, index) => {
                    return  <span>
                        {
                            record.multiState == 10 ? <div>
                                <a href="javascript:;"
                                   className="text-primary btn btn-default btn-sm"
                                   onClick={()=> this.multiSign(record)}
                                >
                                    {tu('signature')}
                                </a>
                                <a href="javascript:;"
                                   className="text-primary btn btn-default btn-sm ml-2"
                                   onClick={() => this.openSignDetailsModal(record)}
                                >
                                    {tu('details')}
                                </a>
                            </div>:record.multiState == 1 ?
                                <div>
                                    <div>
                                        <a href="javascript:;"
                                           className="text-primary btn btn-default btn-sm"
                                           onClick={() => this.openSignDetailsModal(record)}
                                        >
                                            {tu('details')}
                                        </a>
                                    </div>
                                    <div className="mt-3">
                                        <Link className="color-tron-100 list-item-word" to={`/transaction/${record.hash}`}>
                                            {tu('view_on_chain_transactions')}
                                        </Link>
                                    </div>
                                </div>
                                :
                                <div>
                                    <a href="javascript:;"
                                       className="text-primary btn btn-default btn-sm"
                                       onClick={() => this.openSignDetailsModal(record)}
                                    >
                                        {tu('details')}
                                    </a>
                                </div>
                        }

                    </span>
                },
            },

        ];
        return column;
    }


    render() {
       let {data, filter, total, rangeTotal = 0, loading, emptyState: EmptyState = null, isShowSignDetailsModal, details,modal} = this.state;
       console.log('data',data)
       let column = this.customizedColumn();
       return (
           <Fragment>
               <div className="row">
                   <div className="col-md-12">
                       <div className="card list-style-body border-0">
                           <div className="card-header list-style-body__header" style={{'background':'#f3f3f3'}}>
                               <ul className="nav nav-tabs card-header-tabs">
                                       <li className="nav-item">
                                           <a className={filter.multiState == 255? "nav-link text-dark active":"nav-link text-dark"} href="javascript:;" aria-current="page"
                                              onClick={() => this.onRadioChange(255,'address_transfer_all')}
                                           >
                                               <span>{tu('address_transfer_all')}</span>
                                           </a>
                                       </li>
                                       <li className="nav-item">
                                           <a className={filter.multiState ==10? "nav-link text-dark active":"nav-link text-dark"} href="javascript:;" aria-current="page"
                                              onClick={() => this.onRadioChange(0,'to_be_sign')}
                                           >
                                               <span>{tu('to_be_sign')}</span>
                                           </a>
                                       </li>
                                       <li className="nav-item">
                                           <a className={filter.multiState ==11? "nav-link text-dark active":"nav-link text-dark"}  href="javascript:;" aria-current="page"
                                              onClick={() => this.onRadioChange(0,'signed')}
                                           >
                                               <span>{tu('signed')}</span>
                                           </a>
                                       </li>
                                       <li className="nav-item">
                                           <a className={filter.multiState ==2? "nav-link text-dark active":"nav-link text-dark"}  href="javascript:;" aria-current="page"
                                              onClick={() => this.onRadioChange(2,'signature_failed')}
                                           >
                                               <span>{tu('signature_failed')}</span>
                                           </a>
                                       </li>
                                       <li className="nav-item">
                                           <a className={filter.multiState ==1? "nav-link text-dark active":"nav-link text-dark"}  href="javascript:;" aria-current="page"
                                              onClick={() => this.onRadioChange(1,'signature_successful')}
                                           >
                                               <span>{tu('signature_successful')}</span>
                                           </a>
                                       </li>


                               </ul>
                           </div>
                           <div className="token_black pl-4 pr-4 position-relative">
                               {
                                   data.length !== 0 &&   <TotalInfo total={total} rangeTotal={total} typeText="transactions_unit"/>
                               }

                               {
                                   (!loading && data.length === 0 )?
                                       <div className="p-3 text-center no-data">{tu("no_transactions")}</div>:
                                       <SmartTable bordered={true} loading={loading} column={column} data={data} total={20}
                                                   onPageChange={(page, pageSize) => {
                                                       this.load(page, pageSize)
                                                   }}/>
                               }

                           </div>
                       </div>
                   </div>
               </div>
               {isShowSignDetailsModal && <SignDetailsModal onCancel={this.closeSignDetailsModal} details={details} onSign={this.multiSign} />}
               {modal}
           </Fragment>
       )
    }
}

function mapStateToProps(state) {
    return {
        account: state.app.account,
        wallet: state.wallet.current,
        walletType: state.app.wallet,
        currentWallet: state.wallet.current,
        activeLanguage: state.app.activeLanguage,
        sidechains: state.app.sideChains,
    };
}

const mapDispatchToProps = {
};

export default connect(mapStateToProps, mapDispatchToProps)(injectIntl(MySignature))

