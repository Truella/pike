const handbookOrigin = "https://www.frontendinterviewhandbook.com";

const sectionByCategory = {
  "Coding interview": "Coding",
  "Quiz/trivia interview": "Trivia",
  "System design interview": "System Design",
  "Interview questions \u{1f525}": "Company questions",
};

const standaloneSection = {
  introduction: "Introduction",
  behavioral: "Behavioral",
  resume: "Resume",
};

const topicOverrides = {
  introduction: { title: "Introduction", path: "/introduction" },
  "javascript-utility-function": {
    title: "JavaScript coding",
    path: "/coding/javascript-utility-function",
  },
  "build-front-end-user-interfaces": {
    title: "User interface coding",
    path: "/coding/build-front-end-user-interfaces",
  },
  algorithms: { title: "Algorithms coding", path: "/coding/algorithms" },
  trivia: { title: "Quiz/trivia overview", path: "/trivia" },
  "javascript-questions": {
    title: "JavaScript quiz",
    path: "/javascript-questions",
  },
  "css-questions": { title: "CSS quiz", path: "/css-questions" },
  "html-questions": { title: "HTML quiz", path: "/html-questions" },
  "front-end-system-design": {
    title: "Front end system design overview",
    path: "/front-end-system-design",
  },
  "front-end-system-design-ui-components": {
    title: "User interface components",
    path: "/front-end-system-design/ui-components",
  },
  "front-end-system-design-applications": {
    title: "Applications",
    path: "/front-end-system-design/applications",
  },
  behavioral: { title: "Behavioral interviews", path: "/behavioral" },
  resume: { title: "Resume preparation", path: "/resume" },
};

const companyNames = {
  adobe: "Adobe",
  airbnb: "Airbnb",
  amazon: "Amazon",
  apple: "Apple",
  atlassian: "Atlassian",
  "bytedance-tiktok": "ByteDance/TikTok",
  canva: "Canva",
  coinbase: "Coinbase",
  discord: "Discord",
  doordash: "DoorDash",
  dropbox: "Dropbox",
  google: "Google",
  linkedin: "LinkedIn",
  lyft: "Lyft",
  meta: "Meta",
  microsoft: "Microsoft",
  mozilla: "Mozilla",
  netflix: "Netflix",
  openai: "OpenAI",
  oracle: "Oracle",
  palantir: "Palantir",
  pinterest: "Pinterest",
  reddit: "Reddit",
  rippling: "Rippling",
  robinhood: "Robinhood",
  salesforce: "Salesforce",
  shopify: "Shopify",
  squarespace: "Squarespace",
  twitter: "Twitter",
  uber: "Uber",
};

function parseObjectLiteral(source) {
  const exportPosition = source.indexOf("module.exports");

  if (exportPosition === -1) {
    throw new Error("Sidebar source does not use module.exports");
  }

  let position = source.indexOf("=", exportPosition);

  if (position === -1) {
    throw new Error("Sidebar source does not export an object");
  }

  position += 1;

  function skipIgnored() {
    while (position < source.length) {
      if (/\s/.test(source[position])) {
        position += 1;
      } else if (source.startsWith("//", position)) {
        position = source.indexOf("\n", position + 2);
        if (position === -1) position = source.length;
      } else if (source.startsWith("/*", position)) {
        const end = source.indexOf("*/", position + 2);
        if (end === -1) throw new Error("Unterminated sidebar comment");
        position = end + 2;
      } else {
        break;
      }
    }
  }

  function parseString() {
    const quote = source[position++];
    let value = "";

    while (position < source.length && source[position] !== quote) {
      if (source[position] === "\\") {
        position += 1;
        const escaped = source[position];
        const escapes = { n: "\n", r: "\r", t: "\t" };
        value += escapes[escaped] ?? escaped;
      } else {
        value += source[position];
      }
      position += 1;
    }

    if (source[position] !== quote) throw new Error("Unterminated sidebar string");
    position += 1;
    return value;
  }

  function parseIdentifier() {
    const match = source.slice(position).match(/^[A-Za-z_$][\w$-]*/);
    if (!match) throw new Error(`Expected identifier at offset ${position}`);
    position += match[0].length;
    return match[0];
  }

  function parseArray() {
    const values = [];
    position += 1;

    while (true) {
      skipIgnored();
      if (source[position] === "]") {
        position += 1;
        return values;
      }

      values.push(parseValue());
      skipIgnored();
      if (source[position] === ",") {
        position += 1;
      } else if (source[position] !== "]") {
        throw new Error(`Expected comma or ] at offset ${position}`);
      }
    }
  }

  function parseObject() {
    const value = {};
    position += 1;

    while (true) {
      skipIgnored();
      if (source[position] === "}") {
        position += 1;
        return value;
      }

      const key = ["'", '"'].includes(source[position])
        ? parseString()
        : parseIdentifier();
      skipIgnored();
      if (source[position] !== ":") {
        throw new Error(`Expected colon at offset ${position}`);
      }
      position += 1;
      value[key] = parseValue();
      skipIgnored();
      if (source[position] === ",") {
        position += 1;
      } else if (source[position] !== "}") {
        throw new Error(`Expected comma or } at offset ${position}`);
      }
    }
  }

  function parseValue() {
    skipIgnored();
    const character = source[position];

    if (character === "{") return parseObject();
    if (character === "[") return parseArray();
    if (["'", '"'].includes(character)) return parseString();

    const identifier = parseIdentifier();
    if (identifier === "true") return true;
    if (identifier === "false") return false;
    if (identifier === "null") return null;
    throw new Error(`Unsupported sidebar value ${identifier}`);
  }

  return parseValue();
}

function topicDetails(id) {
  if (topicOverrides[id]) return topicOverrides[id];

  const companyMatch = id.match(
    /^companies\/(.+)-front-end-interview-questions$/,
  );

  if (companyMatch) {
    const company = companyNames[companyMatch[1]];
    if (!company) throw new Error(`Unknown company topic: ${id}`);
    return { title: `${company} interview questions`, path: `/${id}` };
  }

  return {
    title: id
      .split("/")
      .at(-1)
      .split("-")
      .map((word) => word[0].toUpperCase() + word.slice(1))
      .join(" "),
    path: `/${id}`,
  };
}

export function parseSidebar(source) {
  const sidebar = parseObjectLiteral(source);

  if (!Array.isArray(sidebar.root)) {
    throw new Error("Sidebar root must be an array");
  }

  const topics = [];

  function addItem(item, inheritedSection) {
    if (typeof item === "string") {
      const section = inheritedSection ?? standaloneSection[item];
      if (!section) throw new Error(`No canonical section for topic: ${item}`);
      const details = topicDetails(item);
      topics.push({
        id: item,
        order_index: topics.length,
        title: details.title,
        section,
        url: new URL(details.path, handbookOrigin).href,
      });
      return;
    }

    if (!item || typeof item !== "object") {
      throw new Error("Sidebar items must be doc IDs or category objects");
    }

    if (item.type === "doc" && typeof item.id === "string") {
      addItem(item.id, inheritedSection);
      return;
    }

    if (item.type !== "category" || !Array.isArray(item.items)) {
      throw new Error(`Unsupported sidebar item type: ${item.type ?? "unknown"}`);
    }

    const section = sectionByCategory[item.label] ?? inheritedSection;
    if (!section) throw new Error(`No canonical section for: ${item.label}`);
    for (const child of item.items) addItem(child, section);
  }

  for (const item of sidebar.root) addItem(item);

  if (new Set(topics.map((topic) => topic.id)).size !== topics.length) {
    throw new Error("Sidebar contains duplicate topic IDs");
  }

  return topics;
}
