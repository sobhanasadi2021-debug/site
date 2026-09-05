const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname);

function readCollection(name, fallback = []) {
  const file = path.join(DATA_DIR, `${name}.json`);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return fallback;
  }
}

function writeCollection(name, data) {
  const file = path.join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

const db = {
  get products() { return readCollection('products'); },
  set products(v) { writeCollection('products', v); },
  get users() { return readCollection('users'); },
  set users(v) { writeCollection('users', v); },
  get orders() { return readCollection('orders'); },
  set orders(v) { writeCollection('orders', v); },
  get messages() { return readCollection('messages'); },
  set messages(v) { writeCollection('messages', v); },
  get coupons() { return readCollection('coupons', []); },
  set coupons(v) { writeCollection('coupons', v); },
  get settings() { return readCollection('settings', null); },
  set settings(v) { writeCollection('settings', v); },

  nextId(list) {
    return list.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
  },
};

module.exports = db;
