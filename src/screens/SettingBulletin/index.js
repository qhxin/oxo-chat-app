import * as React from 'react'
import { View, Button, Alert } from 'react-native'

import { connect } from 'react-redux'
import { BulletinAddressSession, BulletinHistorySession, BulletinMarkSession } from '../../lib/Const'
import { actionType } from '../../redux/actions/actionType'

//设置
class SettingBulletinScreen extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      address: this.props.avatar.get('Address'),
      name: this.props.avatar.get('name')
    }
  }

  clearBulletinCacheAlert() {
    Alert.alert(
      '提示',
      '确定要清除所有缓存公告吗？',
      [
        { text: '确认', onPress: () => this.clearBulletinCache() },
        { text: '取消', style: 'cancel' },
      ],
      { cancelable: false }
    )
  }

  clearBulletinCache() {
    this.props.dispatch({
      type: actionType.avatar.clearBulletinCache
    })
  }

  loadState() {
    this.setState({
      address: this.props.avatar.get('Address'),
      name: this.props.avatar.get('Name')
    })
  }

  componentDidMount() {
    this._unsubscribe = this.props.navigation.addListener('focus', () => {
      this.loadState()
    })
  }

  componentWillUnmount() {
    this._unsubscribe()
  }

  render() {
    return (
      <View>
        <Button title="我的公告" onPress={() => { this.props.navigation.push('BulletinList', { session: BulletinAddressSession, address: this.props.avatar.get('Address') }) }} />
        <Button title="收藏公告" onPress={() => { this.props.navigation.push('BulletinList', { session: BulletinMarkSession }) }} />
        <Button title="浏览历史" onPress={() => { this.props.navigation.push('BulletinList', { session: BulletinHistorySession }) }} />
        <Button title="设置缓存" color="orange" onPress={() => { this.props.navigation.navigate('BulletinCache') }} />
        <Button title="清空缓存" color="red" onPress={() => { this.clearBulletinCacheAlert() }} />
      </View >
    )
  }
}

const ReduxSettingBulletinScreen = connect((state) => {
  return {
    avatar: state.avatar
  }
})(SettingBulletinScreen)

export default ReduxSettingBulletinScreen