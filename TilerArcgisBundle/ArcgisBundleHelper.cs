using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
/// <summary>
/// HHY 切片解析帮助类
/// </summary>
namespace TilerArcgisBundle
{
    public class ArcgisBundleHelper
    {
        //esriMapCacheStorageModeCompact说明切片存储方式为紧促方式
        private string formatV1 = "esriMapCacheStorageModeCompact";
        private string formatV2 = "esriMapCacheStorageModeCompactV2";
        //128x128表示每个数据包中最多存放的切片数量。
        private int packSize = 128;
        //CacheStorageInfo为切片的存储格式描述
        private string storageFormat = "";
        private string guessStorageFormat(){
            return formatV1;
        }
        //文件根目录
        private string rootPath;
        /// <summary>
        /// 实例化帮助类
        /// </summary>
        /// <param name="root">文件目录</param>
        public ArcgisBundleHelper(string root) {
            this.rootPath = root;
            this.storageFormat = guessStorageFormat();
        }
        /// <summary>
        ///  实例化帮助类
        /// </summary>
        /// <param name="root">文件目录</param>
        /// <param name="storageFormat">存储格式</param>
        public ArcgisBundleHelper(string root,string storageFormat)
        {
            this.rootPath = root;
            this.storageFormat = storageFormat;
        }
        /// <summary>
        /// 传入坐标获取切片
        /// </summary>
        /// <param name="x"></param>
        /// <param name="y"></param>
        /// <param name="z"></param>
        public void  GetTile(int x,int y,int z) {
            var packSize = this.packSize;
            var format = this.storageFormat;
            var rGroup = Convert.ToInt32(packSize * Convert.ToInt32(y / packSize));
            var cGroup = Convert.ToInt32(packSize * Convert.ToInt32(x / packSize));

            var bundleBase = getBundlePath(this.rootPath, z, rGroup, cGroup);
            var bundleFileName = bundleBase + ".bundle";
            var context = new bundlx()
            {
                bundleFileName = bundleFileName,
                storageFormat = format
            };
            if (format == formatV1)
            {
                context.bundlxFileName = bundleBase + ".bundlx";
                context.index = packSize * (x - cGroup) + (y - rGroup);
            }
            else if (format == formatV2)
            {
                context.index = packSize * (y - rGroup) + (x - cGroup);
            }
            else
            {
                throw new Exception("Unsupported format:"+ format);
            }
            readTileFromBundle(context);


        }

        /// <summary>
        /// 读取切片并保存
        /// </summary>
        /// <param name="context"></param>
        private void readTileFromBundle(bundlx context) {
             byte[] data = null;
            if (context.storageFormat == formatV1)
            {
                data= readTileFromBundleV1(context);
            }
            else
            {
                data = readTileFromBundleV2(context);
            }
            DateTime dt = DateTime.Now;
            using (FileStream stream = new FileStream(System.Environment.CurrentDirectory + "/"+ string.Format("{0:yyyyMMddHHmmssffff}", dt)+".jpg", FileMode.OpenOrCreate) )
            {
                stream.Write(data,0,data.Length);
            }

        }

        /// <summary>
        /// 读取切片
        /// </summary>
        /// <param name="context"></param>
        /// <returns></returns>
        private byte[] readTileFromBundleV1(bundlx context)
        {
            var bundlxFileName = context.bundlxFileName;
            var bundleFileName = context.bundleFileName;
            var index = context.index;
            using (FileStream file = new FileStream(bundlxFileName, FileMode.Open))
            {
                byte[] buffer = new byte [5];
                byte[] bufferfile = new byte[file.Length];
                file.Read(bufferfile,0,(int)file.Length);
                //读取bundlx文件存储该切片的位置
                buffer = bufferfile.Skip(16 + 5 * index).Take(4).ToArray();
                //偏移量
                var offset = BitConverter.ToInt32(buffer,0);
               return readTile(bundleFileName, offset);
            }
        }
        private byte[] readTileFromBundleV2(bundlx context)
        {
            var bundlxFileName = context.bundlxFileName;
            var bundleFileName = context.bundleFileName;
            var index = context.index;
            using (FileStream file = new FileStream(bundlxFileName, FileMode.Open))
            {
                byte[] buffer = new byte[4];
                file.Read(buffer, 64 + 8 * index, 4);
                var offset = BitConverter.ToInt32(buffer, 0)-4;
                return readTile(bundleFileName, offset);
            }
        }
        /// <summary>
        /// 读取切片对应字节
        /// </summary>
        /// <param name="bundleFileName"></param>
        /// <param name="offset"></param>
        /// <returns></returns>
        private byte[] readTile(string bundleFileName,int offset)
        {
            using (FileStream file = new FileStream(bundleFileName, FileMode.Open))
            {
                byte[] buffer = new byte[4];
                byte[] bufferfile = new byte[file.Length];
                file.Read(bufferfile, 0, (int)file.Length);
                //获取bundle具体切片文件字节数
                buffer = bufferfile.Skip(offset).Take(4).ToArray();
                var length = BitConverter.ToInt32(buffer,0);
                byte[] tileData = new byte[length];
               //根据索引和字节数读出文件位置
                tileData = bufferfile.Skip(offset + 4).Take(length).ToArray();
                return tileData;
            }
        }

        /// <summary>
        /// 查找切片对应的文件路径
        /// </summary>
        /// <param name="root">路径</param>
        /// <param name="level">切片等级</param>
        /// <param name="rGroup"></param>
        /// <param name="cGroup"></param>
        /// <returns></returns>
        private string getBundlePath(string root,int level, int rGroup , int cGroup ) {
            var bundlesDir = root;
            var l = level.ToString();
            var lLength = l.Length;
            if (lLength < 2)
            {
                for (var i = 0; i < 2 - lLength; i++)
                {
                    l = "0" + l;
                }
            }
            l = "L" + l;

            var r = rGroup.ToString("X");
            var rLength = r.Length;
            if (rLength < 4)
            {
                for (var i = 0; i < 4 - rLength; i++)
                {
                    r = "0" + r;
                }
            }
            r = "R" + r;

            var c = cGroup.ToString("X");
            var cLength = c.Length;
            if (cLength < 4)
            {
                for (var i = 0; i < 4 - cLength; i++)
                {
                    c = "0" + c;
                }
            }
            c = "C" + c;
            var bundlePath=string.Format  (@"{0}\_alllayers\{1}\{2}{3}", bundlesDir,
                l, r, c);
            return bundlePath;
        }
    }
}
