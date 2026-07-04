import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import type { ContactData } from '@/components/write/services/contact-service'

const CONTACT_PATH = path.resolve(process.cwd(), 'src/data/contact.yaml')

export function loadContact(): ContactData {
  try {
    return yaml.load(fs.readFileSync(CONTACT_PATH, 'utf8')) as ContactData
  } catch {
    return { name: '', description: '', avatar: '', items: [] }
  }
}
