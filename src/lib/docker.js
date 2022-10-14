import Regex from './regex.js'
import { join } from 'path'
import { statSync } from 'fs'

export default class Dockerfile extends Regex {
  constructor (root = null) {
    root = join(process.env.GITHUB_WORKSPACE, root)

    if (statSync(root).isDirectory()) {
      root = join(root, 'Dockerfile')
    }

    super(root, /LABEL[\s\t]+version=[\t\s+]?[\"\']?([0-9\.]+)[\"\']?/i)
  }
}
