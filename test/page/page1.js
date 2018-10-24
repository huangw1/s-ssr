/**
 * Created by huangw1 on 2018/10/23.
 */

import React from 'react'

export default class extends React.Component {
    constructor(props) {
        super(props)

        this.initState()
        this.updatePageName = this.updatePageName.bind(this)
    }

    initState() {
        this.state = {
            pageName: 'page1'
        }
    }

    updatePageName() {
        this.setState({
            pageName: 'page2'
        })
    }

    render() {
        return <div onClick={this.updatePageName}>Hello from {this.state.pageName}</div>
    }
}