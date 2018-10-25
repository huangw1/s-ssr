/**
 * Created by huangw1 on 2018/10/22.
 */

const React  = require('react')

const Document = (props) => {
    const {
        pageStyles,
        pageScripts,
        initialProps,
        publicPath,
        body,
        pageName,
        helmet
    } = props
    const mainJs = pageScripts.pop()
    return (
        <html>
            <head>
                <title>{pageName}</title>
                {
                    pageStyles.map((url, i) => {
                        return <link key={i} rel='stylesheet' href={publicPath + url} />
                    })
                }

                <script dangerouslySetInnerHTML={{
                    __html: `
                        window.__ssr_DATA = {};
                        window.__ssr_DATA.pageInitialProps = ${JSON.stringify(initialProps)};
                        `
                }}>
                </script>
                {
                    pageScripts.map((url, i) => {
                        return <script key={i} src={publicPath + url} />
                    })
                }
            </head>
            <body>
                <div id="app" dangerouslySetInnerHTML={{ __html: body }} />
                <script src={publicPath + mainJs} />
            </body>
        </html>
    )
}

export default Document