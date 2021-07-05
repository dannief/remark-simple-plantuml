const visit = require("unist-util-visit");
const plantumlEncoder = require("plantuml-encoder");
const fs = require("fs");
const fetch = require("node-fetch");

const DEFAULT_OPTIONS = {
  baseUrl: "https://www.plantuml.com/plantuml/png"
};

function createObjectNode(node, url) {
  const titleAttr = node.meta ? ` title="${node.meta}"` : "";
  const obj = {
    type: "html",
    value: `<object data="${url}"${titleAttr}></object>`
  };
  return Object.assign(node, obj);
}

function createSvgNode(node, value) {
  const obj = {
    type: "html",
    value
  };
  return Object.assign(node, obj);
}

function createImageNode(node, url) {
  node.type = "image";
  node.url = url;
  node.alt = node.meta;
  node.meta = undefined;

  return node;
}

/**
 * Plugin for remark-js
 *
 * See details about plugin API:
 * https://github.com/unifiedjs/unified#plugin
 *
 * You can specify the endpoint of PlantUML with the option 'baseUrl'
 *
 * @param {Object} pluginOptions Remark plugin options.
 */
function remarkSimplePlantumlPlugin(pluginOptions) {
  const options = { ...DEFAULT_OPTIONS, ...pluginOptions };
  const baseUrl = options.baseUrl.replace(/\/$/, "").toLowerCase();

  function encode(content) {
    return `${baseUrl}/${plantumlEncoder.encode(content)}`;
  }

  function getOutputType() {
    return baseUrl.substring(baseUrl.lastIndexOf("/") + 1);
  }

  return async function transformer(syntaxTree, file) {
    const promises = [];

    visit(syntaxTree, "code", node => {
      let { lang, value } = node;
      if (!lang || !value || lang !== "plantuml") return;

      const url = encode(value);

      if (getOutputType() === "png") {
        createImageNode(node, url);
      } else if (getOutputType() === "svg") {
        const promise = fetch(url)
          .then(response => response.text())
          .then(svg => createSvgNode(node, svg))
          .catch(() => {});
        promises.push(promise);
      } else {
        return createObjectNode(node, url);
      }
    });

    visit(syntaxTree, "image", node => {
      let { url } = node;
      const regex = /\.(i|p|plant)uml$/i;
      if (!url || !regex.test(url)) return;

      const filePath = file.cwd + "/" + url;
      const value = fs.readFileSync(filePath, { encoding: "utf8" });
      node.url = encode(value);
    });

    await Promise.all(promises);

    return syntaxTree;
  };
}

module.exports = remarkSimplePlantumlPlugin;
