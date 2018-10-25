/**
 * Created by huangw1 on 2018/10/23.
 */

import React from 'react'

export default class extends React.Component {
    static async getInitialProps({ req, res }) {
        return {
            path: req.url
        }
    }

    constructor(props) {
        super(props)

        this.initState()
        this.updatePageName = this.updatePageName.bind(this)
    }

    initState() {
        this.state = {
            pageName: 'page1',
            path: this.props.path
        }
    }

    updatePageName() {
        this.setState({
            pageName: 'page2'
        })
    }

    render() {
        return <div onClick={this.updatePageName}>Hello from {this.state.pageName}, url from {this.state.path}</div>
    }
}