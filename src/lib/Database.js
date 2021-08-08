import SQLite from "react-native-sqlite-storage"
import { resolve } from "url"
import { DefaultHost } from './Const'

const SettingJson = { "BulletinCacheSize": 0 }

SQLite.enablePromise(true)

export default class Database {
  constructor() {
    this.db = null
  }

  async initDB(name, version, displayName, size) {
    try {
      // console.log(`=====================Database opening`)
      this.db = await SQLite.openDatabase(name, version, displayName, size)
      // console.log(`=====================Database opened`)
      await this.createTable('ADDRESS_MARKS', `CREATE TABLE IF NOT EXISTS ADDRESS_MARKS(
        address VARCHAR(35) PRIMARY KEY,
        name VARCHAR(20) NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
        )`)
      await this.createTable('FRIENDS', `CREATE TABLE IF NOT EXISTS FRIENDS(
        address VARCHAR(35) PRIMARY KEY,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
        )`)
      await this.createTable('FOLLOWS', `CREATE TABLE IF NOT EXISTS FOLLOWS(
        address VARCHAR(35) PRIMARY KEY,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
        )`)
      await this.createTable('ECDHS', `CREATE TABLE IF NOT EXISTS ECDHS(
          address VARCHAR(35) NOT NULL,
          division INTEGER NOT NULL,
          sequence INTEGER NOT NULL,
          aes_key TEXT,
          private_key TEXT,
          public_key TEXT,
          self_json TEXT,
          pair_json TEXT,
          PRIMARY KEY (address, division, sequence)
          )`)

      //timestamp: time that json is sign
      //created_at: time that insert into db
      //confirmed: pair has comfirmed "this message is received and readed"
      //readed: self has read "this message from pair"
      await this.createTable('MESSAGES', `CREATE TABLE IF NOT EXISTS MESSAGES(
          hash VARCHAR(32) PRIMARY KEY,
          sour_address VARCHAR(35),
          dest_address VARCHAR(35),
          sequence INTEGER,
          pre_hash VARCHAR(32) NOT NULL,
          content TEXT,
          timestamp INTEGER,
          created_at INTEGER,
          json TEXT,
          confirmed BOOLEAN DEFAULT FALSE,
          readed BOOLEAN DEFAULT FALSE,
          is_file BOOLEAN DEFAULT FALSE,
          file_saved BOOLEAN DEFAULT FALSE,
          file_sha1 VARCHAR(40)
          )`)

      await this.createTable('BULLETINS', `CREATE TABLE IF NOT EXISTS BULLETINS(
          hash VARCHAR(32) PRIMARY KEY,
          address VARCHAR(35) NOT NULL,
          sequence INTEGER,
          pre_hash VARCHAR(32) NOT NULL,
          quote_size INTEGER,
          content TEXT,
          timestamp INTEGER,
          created_at INTEGER,
          json TEXT,
          is_file BOOLEAN DEFAULT FALSE,
          file_saved BOOLEAN DEFAULT FALSE,
          file_sha1 VARCHAR(40),
          relay_address VARCHAR(35),
          view_at INTEGER,
          mark_at INTEGER,
          is_mark BOOLEAN DEFAULT FALSE,
          is_follow BOOLEAN DEFAULT FALSE
          )`)

      //group
      await this.createTable('GROUPS', `CREATE TABLE IF NOT EXISTS GROUPS(
          group_hash VARCHAR(32) NOT NULL PRIMARY KEY,
          group_address VARCHAR(35) NOT NULL,
          group_name text NOT NULL,
          membership INTEGER,
          updated_at INTEGER
          )`)

      //add, remove
      await this.createTable('GROUP_REQUESTS', `CREATE TABLE IF NOT EXISTS GROUP_REQUESTS(
          address VARCHAR(32) NOT NULL,
          group_hash VARCHAR(32) NOT NULL,
          json TEXT,
          created_at INTEGER,
          PRIMARY KEY (group_hash, address)
          )`)

      //add only
      await this.createTable('GROUP_MANAGES', `CREATE TABLE IF NOT EXISTS GROUP_MANAGES(
          group_hash VARCHAR(32) NOT NULL,
          sequence INTEGER,
          json TEXT,
          hash VARCHAR(32) NOT NULL,
          created_at INTEGER,
          PRIMARY KEY (group_hash, sequence)
          )`)

      //add, remove
      await this.createTable('GROUP_MEMBERS', `CREATE TABLE IF NOT EXISTS GROUP_MEMBERS(
          group_hash VARCHAR(32) NOT NULL,
          address VARCHAR(35) NOT NULL,
          joined_at INTEGER,
    
          aes_key TEXT,
          private_key TEXT,
          public_key TEXT,
          self_json TEXT,
          pair_json TEXT,
    
          PRIMARY KEY (group_hash, address)
          )`)

      //add only, update(readed) only
      await this.createTable('GROUP_MESSAGES', `CREATE TABLE IF NOT EXISTS GROUP_MESSAGES(
          hash VARCHAR(32) PRIMARY KEY,
          group_hash VARCHAR(32) NOT NULL,
          sour_address VARCHAR(35),
          sequence INTEGER,
          pre_hash VARCHAR(32) NOT NULL,
          content TEXT,
          timestamp INTEGER,
          created_at INTEGER,
          json TEXT,
          readed BOOLEAN DEFAULT FALSE,
          is_file BOOLEAN DEFAULT FALSE,
          file_saved BOOLEAN DEFAULT FALSE,
          file_sha1 VARCHAR(40)
          )`)

      await this.createTable('FILES', `CREATE TABLE IF NOT EXISTS FILES(
          sha1 VARCHAR(40) PRIMARY KEY,
          name TEXT NOT NULL,
          ext TEXT NOT NULL,
          size INTEGER NOT NULL,
          chunk INTEGER NOT NULL,
          current_chunk INTEGER DEFAULT -1,
          saved BOOLEAN DEFAULT false,
          created_at INTEGER
          )`)

      //setting
      await this.createTable('HOSTS', `CREATE TABLE IF NOT EXISTS HOSTS(
          address TEXT PRIMARY KEY,
          updated_at INTEGER
          )`)

      await this.createTable('SETTINGS', `CREATE TABLE IF NOT EXISTS SETTINGS(
          settings TEXT PRIMARY KEY,
          updated_at INTEGER
          )`)

      console.log(`************done********************`)
    } catch (e) {
      console.log(e)
    }
  }

  closeDB() {
    console.log("DB Checking")
    if (this.db) {
      console.log("DB Closing")
      this.db.close()
        .then(() => {
          console.log("DB closed")
        })
        .catch(error => {
          this.errorCB(error)
        })
    } else {
      console.log("Database was not OPENED")
    }
  }

  async addAddressMark(address, name, timestamp) {
    let sql = `INSERT INTO ADDRESS_MARKS (address, name, created_at, updated_at)
      VALUES ('${address}', '${name}', ${timestamp}, ${timestamp})`
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, result]) => {
            //console.log(`insertAddressMark=================================${result}`)
            //console.log(result)
            resolve(result)
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  async delAddressMark(address) {
    let sql = `DELETE FROM ADDRESS_MARKS WHERE address = "${address}"`
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, results]) => {
            resolve(results)
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  async saveAddressName(address, name, timestamp) {
    let sql = `UPDATE ADDRESS_MARKS SET name = '${name}', updated_at = ${timestamp} WHERE address = "${address}"`
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, result]) => {
            //console.log(`insertAddressMark=================================${result}`)
            //console.log(result)
            resolve(result)
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  addFriend(address) {
    let timestamp = Date.now()
    let sql = `INSERT INTO FRIENDS (address, created_at, updated_at)
      VALUES ('${address}', ${timestamp}, ${timestamp})`
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, result]) => {
            resolve(result)
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  addFollow(address) {
    let timestamp = Date.now()
    let sql = `INSERT INTO FOLLOWS (address, created_at, updated_at)
      VALUES ('${address}', ${timestamp}, ${timestamp})`
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, result]) => {
            resolve(result)
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  addHost(address) {
    let timestamp = Date.now()
    let sql = `INSERT INTO HOSTS (address, updated_at)
    VALUES ('${address}', ${timestamp})`
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, result]) => {
            resolve(result)
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  loadSetting() {
    let sql = 'SELECT * FROM SETTINGS LIMIT 1'
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, results]) => {
            let len = results.rows.length
            if (len != 0) {
              let json = JSON.parse(results.rows.item(0))
              resolve(json)
            } else {
              resolve(SettingJson)
            }
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  saveSetting(setting) {
    let sql = `UPDATE SETTINGS SET settings = ${JSON.stringify(setting)} WHERE updated_at = "${Date.now()}"`
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, results]) => {
            console.log(tx)
            console.log(results)
            resolve(results)
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  limitBulletinCache(cache_size, address_list) {
    let sql = `DELETE FROM BULLETINS WHERE (SELECT * from BULLETINS is_mark = "FALSE" AND address NOT IN (${address_list}) ORDER BY view_at DESC, created_at DESC OFFSET ${cache_size})`
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, results]) => {
            resolve(results)
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  clearBulletinCache(address_list) {
    let sql = `DELETE FROM BULLETINS WHERE is_mark = "FALSE" AND address NOT IN (${address_list})`
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, results]) => {
            resolve(results)
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  loadAddressBook() {
    let sql = 'SELECT * FROM ADDRESS_MARKS ORDER BY updated_at DESC'
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, results]) => {
            let addressMap = {}
            let addressArray = []
            let len = results.rows.length
            for (let i = 0; i < len; i++) {
              let addressMark = results.rows.item(i)
              addressMap[addressMark.address] = addressMark.name
              addressArray.push({ "Address": addressMark.address, "Name": addressMark.name, "UpdatedAt": addressMark.updated_at })
            }
            resolve([addressMap, addressArray])
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  loadFriends() {
    let sql = 'SELECT * FROM FRIENDS ORDER BY updated_at DESC'
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, results]) => {
            let friends = []
            let len = results.rows.length
            for (let i = 0; i < len; i++) {
              let friend = results.rows.item(i)
              friends.push(friend.address)
            }
            resolve(friends)
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  loadFollows() {
    let sql = 'SELECT * FROM FOLLOWS ORDER BY updated_at DESC'
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, results]) => {
            let follows = []
            let len = results.rows.length
            for (let i = 0; i < len; i++) {
              let follow = results.rows.item(i)
              follows.push(follow.address)
            }
            resolve(follows)
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  loadHosts() {
    let sql = 'SELECT * FROM HOSTS ORDER BY updated_at DESC'
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, results]) => {
            let hosts = []
            let len = results.rows.length
            for (let i = 0; i < len; i++) {
              let host = results.rows.item(i)
              hosts.push({ Address: host.address, UpdatedAt: host.updated_at })
            }
            if (hosts.length == 0) {
              hosts.push({ Address: DefaultHost, UpdatedAt: Date.now() })
            }
            resolve(hosts)
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  loadBulletinBySql(sql) {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, results]) => {
            let bulletins = []
            let len = results.rows.length
            for (let i = 0; i < len; i++) {
              let bulletin = results.rows.item(i)
              bulletins.push({
                'Address': bulletin.address,
                'Timestamp': bulletin.timestamp,
                'CreateAt': bulletin.created_at,
                'Sequence': bulletin.sequence,
                'Content': bulletin.content,
                'Hash': bulletin.hash,
                'QuoteSize': bulletin.quote_size,
                'ViewAt': bulletin.view_at,
                'IsFollow': bulletin.is_follow,
                'IsMark': bulletin.is_mark
              })
            }
            resolve(bulletins)
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  loadLastBulletin(address) {
    let sql = `SELECT * FROM BULLETINS WHERE address = "${address}" ORDER BY sequence DESC LIMIT 1`
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, results]) => {
            let len = results.rows.length
            if (len != 0) {
              resolve(results.rows.item(0))
            } else {
              resolve(null)
            }
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  loadRecentBulletin() {
    let sql = `SELECT * FROM BULLETINS GROUP BY address`
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, results]) => {
            let bulletins = []
            let len = results.rows.length
            for (let i = 0; i < len; i++) {
              let bulletin = results.rows.item(i)
              bulletins.push({
                "Address": bulletin.address,
                'Sequence': bulletin.sequence
              })
            }
            resolve(bulletins)
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  doInsert(sql) {
    console.log(sql)
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, results]) => {
            resolve(results)
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  loadBulletinResponse(address, sequence) {
    let sql = `SELECT * FROM BULLETINS WHERE address = "${address}" AND sequence = ${sequence} LIMIT 1`
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, results]) => {
            let len = results.rows.length
            if (len != 0) {
              resolve(results.rows.item(0))
            } else {
              resolve(null)
            }
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  loadBulletinFromHash(hash) {
    let sql = `SELECT * FROM BULLETINS WHERE hash = "${hash}" LIMIT 1`
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, results]) => {
            let len = results.rows.length
            if (len != 0) {
              let item = results.rows.item(0)
              let bulletin = {
                'Address': item.address,
                'Timestamp': item.timestamp,
                'CreateAt': item.created_at,
                'Sequence': item.sequence,
                'Content': item.content,
                'Hash': item.hash,
                'QuoteSize': item.quote_size,
                'ViewAt': item.view_at,
                'IsFollow': item.is_follow,
                'IsMark': item.is_mark,

                'PreHash': item.pre_hash,
                'QuoteList': []
              }
              if (item.QuoteSize != 0) {
                let json = JSON.parse(item.json)
                bulletin.QuoteList = json.Quote
              }
              console.log(bulletin)
              resolve(bulletin)
            } else {
              resolve(null)
            }
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  updateBulletinViewAt(hash) {
    let sql = `UPDATE BULLETINS SET view_at = ${Date.now()} WHERE hash = "${hash}"`
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, results]) => {
            console.log("===========================update completed")
            console.log(tx)
            console.log(results)
            resolve(results)
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  markBulletin(hash) {
    let sql = `UPDATE BULLETINS SET is_mark = "TRUE", mark_at = ${Date.now()} WHERE hash = "${hash}"`
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, results]) => {
            console.log("===========================update completed")
            console.log(tx)
            console.log(results)
            resolve(results)
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  unmarkBulletin(hash) {
    let sql = `UPDATE BULLETINS SET is_mark = "FALSE" WHERE hash = "${hash}"`
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, results]) => {
            console.log("===========================update completed")
            console.log(tx)
            console.log(results)
            resolve(results)
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  delFriend(address) {
    let sql = `DELETE FROM FRIENDS WHERE address = "${address}"`
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, results]) => {
            resolve(results)
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  delFollow(address) {
    let sql = `DELETE FROM FOLLOWS WHERE address = "${address}"`
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, results]) => {
            resolve(results)
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  async delHost(address) {
    let sql = `DELETE FROM HOSTS WHERE address = "${address}"`
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, results]) => {
            console.log("===========================DELETE completed")
            console.log(tx)
            console.log(results)
            resolve(results)
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  updateHost(address) {
    let sql = `UPDATE HOSTS SET updated_at = ${Date.now()} WHERE address = "${address}"`
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
          .then(([tx, results]) => {
            console.log("===========================update completed")
            console.log(tx)
            console.log(results)
            resolve(results)
          })
      }).catch((err) => {
        console.log(err)
      })
    })
  }

  createTable(table_name, sql) {
    return new Promise((resolve) => {
      this.db.transaction((tx) => {
        tx.executeSql(sql)
      }).then((result) => {
        console.log(`${table_name} created successfully`)
        resolve(result)
      }).catch(error => {
        console.log(error)
      })
    })
  }
}