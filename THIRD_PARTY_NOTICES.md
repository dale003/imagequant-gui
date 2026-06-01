# Third-Party Notices

## pngquant and libimagequant

This application bundles the Windows build of `pngquant 2.17.0` distributed by
[`pngquant.org`](https://pngquant.org/). The bundled executable is stored at
`vendor/pngquant/pngquant.exe`.

`pngquant` uses
[`ImageOptim/libimagequant`](https://github.com/ImageOptim/libimagequant) for
palette quantization.

The original files distributed with the Windows ZIP are included unchanged:

- `vendor/pngquant/COPYRIGHT`
- `vendor/pngquant/README.txt`

Source and project pages:

- `pngquant`: <https://pngquant.org/>
- `pngquant` source: <https://github.com/kornelski/pngquant>
- `libimagequant` source: <https://github.com/ImageOptim/libimagequant>

## License

This repository is released under GPL-3.0-or-later because the bundled
`libimagequant`-based runtime is distributed under the GPL terms for free and
open-source software. Commercial or non-GPL distribution may require a
commercial license from the upstream project.
