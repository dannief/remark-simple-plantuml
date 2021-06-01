const visit = require("unist-util-visit");
const plantumlEncoder = require("plantuml-encoder");
const fs = require("fs");

const DEFAULT_OPTIONS = {
  baseUrl: "https://www.plantuml.com/plantuml/png"
};

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

  function encode(content) {
    return `${options.baseUrl.replace(/\/$/, "")}/${plantumlEncoder.encode(content)}`;
  }

  return function transformer(syntaxTree, file) {
    visit(syntaxTree, "code", node => {
      let { lang, value, meta } = node;
      if (!lang || !value || lang !== "plantuml") return;

      node.type = "image";
      node.url = encode(value);
      node.alt = meta;
      node.meta = undefined;
    });

    visit(syntaxTree, "image", node => {
      let { url } = node;
      const regex = /\.(i|p|plant)uml$/i;
      if (!url || !regex.test(url)) return;

      const filePath = file.cwd + "/" + url;
      const value = fs.readFileSync(filePath, { encoding: "utf8" });
      node.url = encode(value);
    });

    return syntaxTree;
  };
}

module.exports = remarkSimplePlantumlPlugin;
