interface GitHubFile {
  path: string
  mode: '100644' | '100755' | '040000' | '160000' | '120000'
  type: 'blob' | 'tree' | 'commit'
  content?: string
  sha?: string
}

interface GitHubCommit {
  message: string
  author: {
    name: string
    email: string
  }
  committer: {
    name: string
    email: string
  }
  tree: string
  parents: string[]
}

export class GitHubAPI {
  private token: string
  private owner: string
  private repo: string
  private baseURL = 'https://api.github.com'

  constructor(token: string, owner: string, repo: string) {
    this.token = token
    this.owner = owner
    this.repo = repo
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}/repos/${this.owner}/${this.repo}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`GitHub API error: ${response.status} ${error.message || response.statusText}`)
    }

    return response.json()
  }

  async getRef(branch: string = 'main') {
    return this.request(`/git/ref/heads/${branch}`)
  }

  async getCommit(sha: string) {
    return this.request(`/git/commits/${sha}`)
  }

  async createTree(baseTree: string, files: GitHubFile[]) {
    return this.request('/git/trees', {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseTree,
        tree: files,
      }),
    })
  }

  async createCommit(commit: GitHubCommit) {
    return this.request('/git/commits', {
      method: 'POST',
      body: JSON.stringify(commit),
    })
  }

  async updateRef(branch: string, sha: string) {
    return this.request(`/git/refs/heads/${branch}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha }),
    })
  }

  async createOrUpdateFile(path: string, content: string, message: string, branch: string = 'main') {
    try {
      // Try to get existing file to get its SHA
      const existingFile = await this.request(`/contents/${path}?ref=${branch}`)
      const sha = existingFile.sha

      // Update existing file
      return this.request(`/contents/${path}`, {
        method: 'PUT',
        body: JSON.stringify({
          message,
          content: Buffer.from(content).toString('base64'),
          sha,
          branch,
        }),
      })
    } catch (error: any) {
      if (error.message.includes('404')) {
        // File doesn't exist, create new one
        return this.request(`/contents/${path}`, {
          method: 'PUT',
          body: JSON.stringify({
            message,
            content: Buffer.from(content).toString('base64'),
            branch,
          }),
        })
      }
      throw error
    }
  }

  async commitFiles(files: Array<{ path: string; content: string }>, message: string, branch: string = 'main') {
    try {
      // Get the latest commit SHA
      const ref = await this.getRef(branch)
      const latestCommit = await this.getCommit(ref.object.sha)

      // Create tree with new files
      const treeFiles: GitHubFile[] = files.map(file => ({
        path: file.path,
        mode: '100644',
        type: 'blob',
        content: file.content,
      }))

      const tree = await this.createTree(latestCommit.tree.sha, treeFiles)

      // Create commit
      const commit = await this.createCommit({
        message,
        author: {
          name: 'Blog Editor',
          email: 'editor@blog.com',
        },
        committer: {
          name: 'Blog Editor',
          email: 'editor@blog.com',
        },
        tree: tree.sha,
        parents: [latestCommit.sha],
      })

      // Update branch reference
      await this.updateRef(branch, commit.sha)

      return commit
    } catch (error) {
      console.error('Error committing files:', error)
      throw error
    }
  }
}
