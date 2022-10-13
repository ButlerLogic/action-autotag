import fs from 'fs'
import path from 'path'

export default class Package {
  constructor (root = './') {
    root = path.join(process.env.GITHUB_WORKSPACE, root)

    if (fs.statSync(root).isDirectory()) {
      root = path.join(root, 'package.json')
    }

    if (!fs.existsSync(root)) {
      throw new Error(`package.json does not exist at ${root}.`)
    }

    this.root = root
    this.data = JSON.parse(fs.readFileSync(root))
  }

  get version () {
    return this.data.version
  }
}
