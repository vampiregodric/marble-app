import { Platform } from 'react-native';
import { RequestPhoto, SimulationImage } from '../firebase/models';
import { S } from '../i18n';

// Ficheiros que a app escreve: a foto de perfil do cliente (Secção 5b) e,
// desde a Secção 7, as fotos que o cliente junta a um pedido de orçamento
// (as fotos dos trabalhos são carregadas pela equipa no backoffice). Vão
// diretas para o Cloudinary com um upload preset "unsigned" (marble-avatars,
// marble-requests):
// não há API secret na app nem servidor nosso; o preset define a pasta, o
// tamanho máximo e os formatos aceites, e é isso que trava abusos (qualquer
// pessoa com o cloud name consegue usar o preset).
//
// O que fica em clients/{uid}.avatarUrl é um URL de entrega já com o
// recorte quadrado — a app só precisa de o mostrar.
//
// Apagar ficheiros exige a API assinada, por isso remover a foto (ou apagar
// a conta) só limpa o campo no Firestore. O ficheiro fica no Cloudinary com
// a tag `uid_<uid>` para a equipa (ou a Secção 6, automaticamente) o
// encontrar e apagar — a política de privacidade promete 30 dias.

const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
const preset = process.env.EXPO_PUBLIC_CLOUDINARY_PRESET_AVATARS ?? '';
const requestPreset = process.env.EXPO_PUBLIC_CLOUDINARY_PRESET_REQUESTS ?? '';
// Simulador "como ficaria" (Secção 16): preset unsigned marble-simulations
// (pasta simulations, só imagens, c_limit 2000). A Cloud Function usa o
// MESMO preset para guardar o resultado.
const simulationPreset = process.env.EXPO_PUBLIC_CLOUDINARY_PRESET_SIMULATIONS ?? '';

export const avatarUploadConfigured = Boolean(cloudName && preset);
// Sem preset, o formulário de orçamento esconde a secção das fotos.
export const requestUploadConfigured = Boolean(cloudName && requestPreset);
// Sem preset, o simulador avisa que ainda não está configurado.
export const simulationUploadConfigured = Boolean(cloudName && simulationPreset);

// Lado do quadrado entregue à app. O ficheiro guardado tem até 1024 px
// (reduzido no telemóvel antes de subir, ver avatarPicker.ts).
const AVATAR_SIZE = 512;

// `g_face` centra o recorte na cara quando o Cloudinary deteta uma; senão
// recorta ao centro. `v<version>` evita caches antigas na CDN.
export function avatarDeliveryUrl(publicId: string, version?: number | string): string {
  const v = version ? `v${version}/` : '';
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,w_${AVATAR_SIZE},h_${AVATAR_SIZE},g_face,q_auto,f_auto/${v}${publicId}`;
}

// Reescreve um URL de entrega do Cloudinary (o formato que o backoffice
// grava em works.photoUrl, settings/home.departmentCovers, etc.) para
// entregar a imagem INTEIRA reduzida a `width` px de largura: `c_limit`
// não corta nada. Serve os sítios que mostram a foto sem a cortar
// (`fit="contain"` no Photo — decisão do Fábio, 2026-09-09) e que não podem
// usar o `thumbnailUrl`, porque esse já vem recortado a 4:3 pelo
// backoffice (c_fill,w_480,h_360). Substitui o primeiro segmento de
// transformação, se existir; URLs de outros sítios saem como entraram.
export function cloudinaryWhole(url: string | undefined | null, width: number): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  const m = trimmed.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/);
  if (!m) return trimmed;
  let rest = m[2];
  const first = rest.split('/')[0];
  // Um segmento de transformação é "chave_valor" separados por vírgulas
  // (c_fill,w_480,h_360,q_auto,f_auto); "v123" (versão) e o public_id não são.
  if (/^(?:[a-z]{1,2}_[^/,]+)(?:,[a-z]{1,2}_[^/,]+)*$/.test(first) && /(^|,)[cwhqfg]_/.test(first)) {
    rest = rest.slice(first.length + 1);
  }
  return `${m[1]}c_limit,w_${width},q_auto,f_auto/${rest}`;
}

type UploadResponse = {
  public_id: string;
  version?: number;
  secure_url: string;
  width?: number;
  height?: number;
};

// Sobe a imagem local (URI devolvido por avatarPicker.ts) e devolve o URL
// de entrega a guardar em clients/{uid}.avatarUrl.
export async function uploadAvatar(localUri: string, uid: string, onProgress?: (fraction: number) => void): Promise<string> {
  if (!avatarUploadConfigured) {
    throw new Error(S.errors.avatarNotConfigured);
  }
  const form = new FormData();
  if (Platform.OS === 'web') {
    // No browser o URI é blob:/data: — converte-se em Blob para o FormData.
    const blob = await (await fetch(localUri)).blob();
    form.append('file', blob, 'avatar.jpg');
  } else {
    // No React Native o FormData aceita um ficheiro local por URI.
    form.append('file', { uri: localUri, name: 'avatar.jpg', type: 'image/jpeg' } as unknown as Blob);
  }
  form.append('upload_preset', preset);
  form.append('tags', `avatar,uid_${uid}`);

  const res = await xhrUpload(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, form, onProgress);
  return avatarDeliveryUrl(res.public_id, res.version);
}

// Foto de um pedido de orçamento (Secção 7). Tag `request_<id>` (e não
// `uid_<uid>`, senão a limpeza da foto de perfil apagava-as): é por ela que
// a Function apaga os ficheiros quando o pedido é anonimizado. Devolve os
// URLs de entrega no mesmo formato das fotos dos trabalhos no backoffice.
export async function uploadRequestPhoto(localUri: string, requestId: string, onProgress?: (fraction: number) => void): Promise<RequestPhoto> {
  if (!requestUploadConfigured) {
    throw new Error(S.errors.requestUploadNotConfigured);
  }
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(localUri)).blob();
    form.append('file', blob, 'foto.jpg');
  } else {
    form.append('file', { uri: localUri, name: 'foto.jpg', type: 'image/jpeg' } as unknown as Blob);
  }
  form.append('upload_preset', requestPreset);
  form.append('tags', `request,request_${requestId}`);

  let res: UploadResponse;
  try {
    res = await xhrUpload(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, form, onProgress);
  } catch (err) {
    // Preset ainda não criado na consola do Cloudinary (configuração, não
    // é culpa do cliente): diz-lhe o que fazer em vez do erro em inglês.
    if (err instanceof Error && /preset/i.test(err.message)) {
      throw new Error(S.errors.requestPresetMissing);
    }
    throw err;
  }
  const v = res.version ? `v${res.version}/` : '';
  return {
    url: `https://res.cloudinary.com/${cloudName}/image/upload/c_limit,w_1600,q_auto,f_auto/${v}${res.public_id}`,
    thumbnailUrl: `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,w_480,h_360,q_auto,f_auto/${v}${res.public_id}`,
    publicId: res.public_id,
  };
}

// Foto do chão/carro do cliente para uma simulação (Secção 16). Tag
// `simulation_<id>` — a Function apaga por ela quando a simulação é apagada
// (pelo cliente, pela equipa ou pela retenção). O resultado da IA fica
// depois com a mesma tag, escrito pela Function.
export async function uploadSimulationPhoto(localUri: string, simulationId: string, onProgress?: (fraction: number) => void): Promise<SimulationImage> {
  if (!simulationUploadConfigured) {
    throw new Error(S.errors.simulationUploadNotConfigured);
  }
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(localUri)).blob();
    form.append('file', blob, 'foto.jpg');
  } else {
    form.append('file', { uri: localUri, name: 'foto.jpg', type: 'image/jpeg' } as unknown as Blob);
  }
  form.append('upload_preset', simulationPreset);
  form.append('tags', `simulation,simulation_${simulationId}`);

  let res: UploadResponse;
  try {
    res = await xhrUpload(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, form, onProgress);
  } catch (err) {
    if (err instanceof Error && /preset/i.test(err.message)) {
      throw new Error(S.errors.simulationPresetMissing);
    }
    throw err;
  }
  return simulationImage(res.public_id, res.version);
}

// URLs de entrega de uma imagem de simulação (foto do cliente ou resultado),
// no mesmo formato das fotos dos pedidos. A Function usa o mesmo formato
// para o resultado, com o selo "SIMULAÇÃO" por cima (ver functions/src/simulations.ts).
export function simulationImage(publicId: string, version?: number | string): SimulationImage {
  const v = version ? `v${version}/` : '';
  return {
    url: `https://res.cloudinary.com/${cloudName}/image/upload/c_limit,w_1600,q_auto,f_auto/${v}${publicId}`,
    thumbnailUrl: `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,w_480,h_360,q_auto,f_auto/${v}${publicId}`,
    publicId,
  };
}

// XMLHttpRequest em vez de fetch por causa do progresso do envio (o fetch
// não o expõe no React Native). Existe nos dois lados: web e nativo.
function xhrUpload(url: string, form: FormData, onProgress?: (fraction: number) => void): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onerror = () => reject(new Error(S.errors.uploadNetwork));
    xhr.ontimeout = () => reject(new Error(S.errors.uploadTimeout));
    xhr.timeout = 60_000;
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as UploadResponse);
        return;
      }
      let msg = S.errors.uploadStatus(xhr.status);
      try {
        const body = JSON.parse(xhr.responseText) as { error?: { message?: string } };
        if (body.error?.message) msg = body.error.message;
      } catch {
        /* resposta sem JSON */
      }
      reject(new Error(msg));
    };
    xhr.send(form);
  });
}
