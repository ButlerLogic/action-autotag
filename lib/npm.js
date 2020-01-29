const fs = require('fs')
const path = require('path')
const execSync = require('child_process').execSync

class npm {
  constructor(token, registry = 'registry.npmjs.org') {
    if (!token || token.trim().length === 0) {
      throw new Error('Missing REGISTRY_TOKEN.')
    }

    this.token = token
    this.registry = registry || 'registry.npmjs.org'
  }

  publish (dir, forcePublic = true) {
    this.config(dir)
    const cmd = `npm publish${forcePublic ? ' --access=public' : ''}`
    
    let response = execSync(cmd, { cwd: dir })

    if (response.indexOf('npm ERR!') >= 0) {
      throw new Error(response)
    }
  }

  config (dir) {
    dir = path.resolve(dir)

    let npmrc = this.npmrc(dir)
    let npmrcFile = path.join(dir, '.npmrc')

    if (fs.existsSync(npmrcFile)) {
      fs.unlinkSync(npmrcFile)
    }
    console.log('Writing to', npmrcFile)
    console.log('npmrc content: ', npmrc.replace(this.token, 'TOKEN'))
    console.log('------')
    fs.writeFileSync(npmrcFile, npmrc)
  }

  npmrc (dir) {
    const file = path.join(dir, '.npmrc')

    if (!fs.existsSync(file)) {
      return `//${this.registry}/:_authToken=${this.token}`
    }

    let content = fs.readFileSync(file).toString()
    let hasRegistry = false

    content = content.split(/\n+/).map(line => {
      const match = /(\/{2}[\S]+\/:?)/.exec(line)

      if (match !== null) {
        hasRegistry = true
        line = `${match[1]}:`.replace(/:+$/, ':') + `_authToken=${this.token}`
      }

      return line
    }).join('\n').trim()

    if (!hasRegistry) {
      content += `\n//${this.registry}/:_authToken=${this.token}`
    }

    return content.trim()
  }
}

module.exports = npm
