export class FindCategoryByIdQuery {
  constructor(
    public readonly userId: string,
    public readonly categoryId: string,
  ) {}
}
