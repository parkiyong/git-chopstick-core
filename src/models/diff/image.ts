export class Image {
  public constructor(
    public readonly rawContents: ArrayBufferLike,
    public readonly contents: string,
    public readonly mediaType: string,
    public readonly bytes: number
  ) {}
}
