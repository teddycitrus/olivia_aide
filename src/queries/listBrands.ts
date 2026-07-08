import { type ListBrands } from 'wasp/server/operations'
import { type Brand } from 'wasp/entities'

export const listBrands: ListBrands<void, Brand[]> = async (_args, context) => {
  return context.entities.Brand.findMany({ orderBy: { createdAt: 'desc' } })
}
