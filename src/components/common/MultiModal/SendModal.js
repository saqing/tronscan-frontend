/* eslint-disable no-restricted-globals */
import {connect} from "react-redux";
import React from "react";
import {find} from "lodash";
import SendForm from "./SendForm";
import {Modal, ModalBody, ModalHeader} from "reactstrap";
import SweetAlert from "react-bootstrap-sweetalert";
import {tu} from "../../../utils/i18n";
import {injectIntl} from "react-intl";

@injectIntl
class SendModal extends React.PureComponent {

  constructor({isOpen = false, to = ""}) {
    super();

    this.state = {
      isOpen,
      modal: (
          <Modal backdrop="static" isOpen={true} toggle={this.hideModal} fade={false} className="modal-dialog-centered fiexd-none send-modal">
            <ModalHeader className="text-center" toggle={this.hideModal}>Multi Send</ModalHeader>
            <ModalBody className="">
              <SendForm to={to} onSend={this.onSend} onClose={this.hideModal} onMultiSend={(permissionId, permissionTime, from) =>this.onMultiSend(permissionId, permissionTime, from)}/>
            </ModalBody>
          </Modal>
      )
    };
  }



  hideModal = () => {
    let {onClose} = this.props;
    onClose && onClose();
  };

  onMultiSend = (permissionId, permissionTime, from) => {
      let {onMultiSignSend} = this.props;
      onMultiSignSend && onMultiSignSend(permissionId, permissionTime, from);
  };
  onSend = () => {
    this.setState({
      modal: (
          <SweetAlert success title="transaction_create_successful" onConfirm={this.hideModal}/>
      )
    });
  };

  componentDidUpdate(prevProps) {
      // let { code } = this.props;
      // if(prevProps.code !== code && prevProps.code == 0 ){
      //     this.onSend()
      // }
  }

  render() {

    let {intl, account} = this.props;

    let {modal} = this.state;

    if (!account.isLoggedIn) {
      return (
          <SweetAlert danger title={intl.formatMessage({id: 'not_login'})} onConfirm={this.hideModal}>
            {tu("login_first")}
          </SweetAlert>
      )
    }

    return modal;
  }
}

function mapStateToProps(state) {
  return {
    account: state.app.account,
    tokenBalances: state.account.tokens,
  };
}

const mapDispatchToProps = {};

export default connect(mapStateToProps, mapDispatchToProps)(SendModal)
