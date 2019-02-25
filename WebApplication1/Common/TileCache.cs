using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using TilerArcgisBundle;

namespace WebApplication1.Common
{
    /// <summary>
    /// 缓存切片单例类
    /// </summary>
    public class TileCache
    {
        /// <summary>
        /// 获取切片文件索引
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        public BundleCache this[bundlx id]
        {
            get
            {
                return AddBundleCache(id);
            }
        }
        private static volatile TileCache instance;
        private static readonly object obj = new object();
        private TileCache() { }
        //线程安全单例
        public static TileCache Instance
        {
            get
            {
                if (null == instance)
                {
                    lock (obj)
                    {
                        if (null == instance)
                        {
                            instance = new TileCache();
                        }
                    }

                }
                return instance;
            }
        }
        /// <summary>
        /// 设置最多缓存文件数目
        /// </summary>
        private static int cacheCount = 20;
        /// <summary>
        /// 切片文件缓存集合类
        /// </summary>
        private static List<BundleCache> bundleCacheList = new List<BundleCache>();
        /// <summary>
        /// 通过id返回切片缓存
        /// </summary>
        /// <param name="cache"></param>
        /// <returns></returns>
        private static BundleCache AddBundleCache(bundlx cache)
        {
            string cacheid = cache.id;

                if (bundleCacheList.Select(e => e.BundleId).ToList().Contains(cacheid))
                {
                    //更新最后访问时间
                    BundleCache tem = bundleCacheList.Where(e => e.BundleId == cacheid).FirstOrDefault();
                    tem.LastTime = DateTime.Now;
                    changeCache();
                    return bundleCacheList.Where(e => e.BundleId == cacheid).FirstOrDefault();
                }
                else
                {
                    //未添加的文件，写入缓存集合
                    BundleCache bc = new BundleCache();
                    bc.BundleId = cache.id;
                    bc.CTime = DateTime.Now;
                    bc.LastTime = DateTime.Now;
                    using (FileStream file = new FileStream(cache.bundlxFileName, FileMode.Open))
                    {
                        byte[] bufferfile = new byte[file.Length];
                        file.Read(bufferfile, 0, (int)file.Length);
                        //写入数据
                        bc.BundlxData = bufferfile;
                    }
                    using (FileStream file = new FileStream(cache.bundleFileName, FileMode.Open))
                    {
                        byte[] bufferfile = new byte[file.Length];
                        file.Read(bufferfile, 0, (int)file.Length);
                        //写入数据
                        bc.BundleData = bufferfile;
                    }
                    bundleCacheList.Add(bc);
                    changeCache();
                    return bc;
            }
        }
        /// <summary>
        /// 保证缓存文件数目一定
        /// </summary>
        private static void changeCache()
        {
            if (bundleCacheList.Count>cacheCount)
            {
                bundleCacheList= bundleCacheList.OrderByDescending(e => e.LastTime).ToList().Take(cacheCount).ToList();
            }
        }
    }
}