/*global module:false*/
module.exports = function(grunt) {

  // Add mochaTest task
  grunt.loadNpmTasks('grunt-mocha-test');

  function getLintConfig() {
    return {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        es5: true
      },
      globals: {
      }
    };
  }
  
  function getNodeLintConfig() {
    var config = getLintConfig();
    config.options.node = true;
    return config;
  }

  function getNodeTestLintConfig() {
    var config = getNodeLintConfig();
    config.globals.describe = false;
    config.globals.it = false;
    return config;
  }

  // Project configuration.
  grunt.initConfig({
    lint: {
      node: ['grunt.js', 'src/**/*.js'],
      nodeTest: ['test/**/*.js']
    },
    jshint: {
      node: getNodeLintConfig(),
      nodeTest: getNodeTestLintConfig()
    },
    mochaTest: {
      files: ['test/**/*.test.js']
    },
    mochaTestConfig: {
      options: {
        reporter: 'nyan'        
      }
    },
    watch: {
      scripts: {
        files: ['<config.lint:node>'],
        tasks: 'default'
      }
    }
  });

  // Default task.
  grunt.registerTask('default', 'lint mochaTest');
};