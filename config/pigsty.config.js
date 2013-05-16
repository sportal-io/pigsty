module.exports = {

  sensor: {
     name: 'jen_laptop',
     interface: 'em0'
  },

  references: {
    reference_file:      './config/references/reference.config',
    classification_file: './config/references/classification.config',
    gen_file:            './config/references/gen-msg.map',
    sid_file:            './config/references/sid-msg.map'
  },

  logs: {
    // e.g., /var/snort/logs
    path: './logs',

    // either 'continuous' or 'read'.  Will exit after reading unless mode == 'continuous'.
    mode: 'continuous', 

    // Uncomment below to set a bookmark file.
    // bookmark: './config/.bookmark'
  },

  // configure your output plugins here.
  output: {
    
    mysql: {
      ssl: true,
      user: 'root',
      password: 's3cr3tsauce',
      host: '127.0.0.1',
      database: 'snorbyfresh',
      max_pool_size: 10 
    },

    // websocket: [
      // {
        // host: "127.0.0.1",
        // port: 3000
      // },
      // {
        // host: "127.0.0.1",
        // port: 3001
      // } 
    // ],

    // postgres: {
      // ssl: true,
      // user: 'root',
      // password: 's3cr3tsauce',
      // host: '127.0.0.1',
      // database: 'snorby',
    // }
    
  } // outputs
}




