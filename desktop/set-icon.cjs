// Grava o ícone do TypeCar dentro do .exe gerado (sem precisar de certificado)
const path = require('node:path');
const mod = require('rcedit');
const rcedit = mod.rcedit ?? mod;

const exe = path.join(__dirname, 'release', 'win-unpacked', 'TypeCar.exe');
rcedit(exe, {
  icon: path.join(__dirname, 'icon.ico'),
  'version-string': { ProductName: 'TypeCar', FileDescription: 'TypeCar', CompanyName: 'TypeCar' },
})
  .then(() => console.log('Ícone aplicado em', exe))
  .catch((e) => {
    console.error('Não foi possível aplicar o ícone:', e.message);
    process.exit(1);
  });
