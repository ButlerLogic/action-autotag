import core from '@actions/core'
import fs from 'fs'
import path from 'path'

export default class Setup {
  static debug () {
    // Metadate for debugging
    core.debug(
      ` Available environment variables:\n -> ${Object.keys(process.env)
        .map(i => i + ' :: ' + process.env[i])
        .join('\n -> ')}`
    )

    const dir = fs
      .readdirSync(path.resolve(process.env.GITHUB_WORKSPACE), { withFileTypes: true })
      .map(entry => {
        return `${entry.isDirectory() ? '> ' : '  - '}${entry.name}`
      })
      .join('\n')

    core.debug(` Working Directory: ${process.env.GITHUB_WORKSPACE}:\n${dir}`)
  }

  static requireAnyEnv () {
    for (const arg of arguments) {
      if (!process.env.hasOwnProperty(arg)) {
        return
      }
    }

    throw new Error('At least one of the following environment variables is required: ' + Array.slice(arguments).join(', '))
  }
}
