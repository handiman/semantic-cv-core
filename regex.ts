export default {
  url: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
  emailAddress: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i,
  phoneNumber: /^\+?[0-9 ()-]{6,20}$/i,
  whiteSpace: /^\s+|\s+$/g,
  styleTag: /<style\s+type="text\/css">[\s\S]*?<\/style>/,
  scriptModule: /<script\s+type="module">[\s\S]*?<\/script>/,
  slugify: /[<>:"/\\|?*\x00-\x1F ]/g
};
