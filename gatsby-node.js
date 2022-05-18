const url = require("url");
const path = require("path");
const axios = require("axios");
const fse = require("fs-extra");
const { extractUrls } = require("./parse-sitemap");

const withoutTrailingSlash = (path) => path === `/` ? path : path.replace(/\/$/, ``);

if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function (find, replace) {
        return this.split(find).join(replace);
    };
}

exports.createPages = async ({ actions, graphql }, options) => {
    const { createRedirect } = actions;

    let { baseUrl, gatsbyUrl, auth, publicPath, pathPrefix = '' } = options || {};

    if (!baseUrl) {
        throw new Error("gatsby-plugin-yoast-sitemap: You must define the url for your Wordpress Install. This should not contain /graphql, if using gatsby-source-wordpress.")
    }

    if (!gatsbyUrl) {
        throw new Error("gatsby-plugin-yoast-sitemap: You must define the URL for your Gatsby-hosted site. This may be localhost.")
    }

    if (!publicPath) publicPath = `./public`

    const gatsbyDomain = gatsbyUrl
        .replace("https://", "")
        .replace("http://", "");

    const baseDomain = baseUrl
        .replace("https://", "")
        .replace("http://", "");

    let siteMapIndex = await axios.get(
        `${withoutTrailingSlash(baseUrl)}/sitemap_index.xml`,
        {
            auth: auth
        }
    );
    let styleSheet = await axios.get(
        `${withoutTrailingSlash(baseUrl)}/wp-content/plugins/wordpress-seo/css/main-sitemap.xsl`,
        {
            auth: auth
        }
    );
    styleSheet = styleSheet.data;
    const downloadableXMLNodes = await extractUrls(siteMapIndex.data);
    siteMapIndex = siteMapIndex.data.replaceAll(baseDomain, `${gatsbyDomain}${pathPrefix}`);

    siteMapIndex = siteMapIndex.replace(
        `wp-content/plugins/wordpress-seo/css/main-sitemap.xsl`,
        `/stylesheet.xsl`
    );

    await fse.outputFile(
        path.join(publicPath, `sitemap_index.xml`),
        siteMapIndex
    );
    await fse.outputFile(
        path.join(publicPath, `stylesheet.xsl`),
        styleSheet
    );

    for (const node of downloadableXMLNodes) {
        let mapFromNode = await axios.get(node, {
            auth: auth,
        });
        mapFromNode = mapFromNode.data.replaceAll(baseDomain, `${gatsbyDomain}${pathPrefix}`);

        mapFromNode = mapFromNode.replace(
            `wp-content/plugins/wordpress-seo/css/main-sitemap.xsl`,
            `/stylesheet.xsl`
        );

        const url_parts = url.parse(node);

        await fse.outputFile(
            path.join(publicPath, url_parts.pathname),
            mapFromNode
        );
    }

    createRedirect({
        fromPath: `/sitemap.xml`,
        toPath: `/sitemap_index.xml`,
        isPermanent: false,
        redirectInBrowser: true,
        force: true,
    });
};
